#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <string>
#include <map>
#include <vector>

using namespace emscripten;

class GameServer {
private:
    int port;
    bool isRunning;
    val console;
    val self;

    struct Player {
        std::string id;
        std::string name;
        double x;
        double y;
        double angle;
        int health;
        int maxHealth;
        int damage;
    };

    std::map<std::string, Player> players;

public:
    GameServer(int port) : port(port), isRunning(false) {
        // Get global objects
        self = val::global("self");
        console = val::global("console");
    }

    void start() {
        if (isRunning) return;
        isRunning = true;

        // Create server info object
        val serverInfo = val::object();
        serverInfo.set("port", port);
        
        // Log server start
        std::string logMessage = "Server starting on port " + std::to_string(port);
        console.call<void>("log", val(logMessage));

        // Create message object
        val message = val::object();
        message.set("type", val("server_start"));
        message.set("data", serverInfo);

        // Send message using self.postMessage
        if (self.hasOwnProperty("postMessage")) {
            self.call<void>("postMessage", message);
        } else {
            console.call<void>("error", val("self.postMessage is not available"));
        }
    }

    void stop() {
        if (!isRunning) return;
        isRunning = false;

        // Log server stop
        console.call<void>("log", val("Server stopped"));

        // Create stop message
        val message = val::object();
        message.set("type", val("server_stop"));

        // Send message using self.postMessage
        if (self.hasOwnProperty("postMessage")) {
            self.call<void>("postMessage", message);
        }
    }

    void handleMessage(const std::string& messageStr) {
        // Parse message using JavaScript JSON
        val JSON = val::global("JSON");
        val parsedMessage = JSON.call<val>("parse", val(messageStr));
        std::string type = parsedMessage["type"].as<std::string>();

        if (type == "connect") {
            std::string clientId = parsedMessage["clientId"].as<std::string>();
            handleConnect(clientId);
        } else if (type == "disconnect") {
            std::string clientId = parsedMessage["clientId"].as<std::string>();
            handleDisconnect(clientId);
        }
    }

private:
    void handleConnect(const std::string& clientId) {
        // Create new player
        Player player;
        player.id = clientId;
        player.name = "Player " + clientId;
        player.x = 200;
        player.y = 1000;
        player.angle = 0;
        player.health = 100;
        player.maxHealth = 100;
        player.damage = 10;

        players[clientId] = player;

        // Create response message
        val response = val::object();
        response.set("type", val("connected"));
        response.set("clientId", val(clientId));

        // Create message object
        val message = val::object();
        message.set("type", val("send_message"));
        message.set("clientId", val(clientId));
        message.set("data", response);

        // Send message using self.postMessage
        if (self.hasOwnProperty("postMessage")) {
            self.call<void>("postMessage", message);
        }
    }

    void handleDisconnect(const std::string& clientId) {
        players.erase(clientId);
        
        // Create disconnect message
        val message = val::object();
        message.set("type", val("client_disconnected"));
        message.set("clientId", val(clientId));

        // Send message using self.postMessage
        if (self.hasOwnProperty("postMessage")) {
            self.call<void>("postMessage", message);
        }
    }
};

// Bindings for JavaScript
EMSCRIPTEN_BINDINGS(game_server) {
    class_<GameServer>("GameServer")
        .constructor<int>()
        .function("start", &GameServer::start)
        .function("stop", &GameServer::stop)
        .function("handleMessage", &GameServer::handleMessage);
} 