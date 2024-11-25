export class SVGLoader {
    private cache: Map<string, SVGElement>;

    constructor() {
        this.cache = new Map();
    }

    async loadSVG(path: string): Promise<SVGElement> {
        // Check cache first
        if (this.cache.has(path)) {
            return this.cache.get(path)!.cloneNode(true) as SVGElement;
        }

        try {
            const response = await fetch(path);
            const svgText = await response.text();
            
            // Create a temporary container to parse SVG
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgText, 'image/svg+xml');
            
            // Check if we got a valid SVG
            const svgElement = doc.querySelector('svg');
            if (!svgElement) {
                throw new Error('Invalid SVG file');
            }

            // Store in cache
            this.cache.set(path, svgElement.cloneNode(true) as SVGElement);
            
            return svgElement;
        } catch (error) {
            console.error(`Failed to load SVG from ${path}:`, error);
            throw error;
        }
    }

    // Helper method to render SVG into a container
    async renderSVG(path: string, container: HTMLElement): Promise<void> {
        const svg = await this.loadSVG(path);
        container.innerHTML = '';
        container.appendChild(svg);
    }
} 