interface pixel {
    r: number,
    g: number,
    b: number
};

export class Pixel {

    public r: number;
    public g: number;
    public b: number;
    public net: number;

    constructor(pixel: pixel) {
        this.r = pixel.r;
        this.g = pixel.g;
        this.b = pixel.b;
    }

    /**
     * Increment the r,g,b values with another pixel
     */
    add = (pixel: pixel) => {
        this.r += pixel.r;
        this.g += pixel.g;
        this.b += pixel.b;
    }

    /**
     * Average out the r,g,b values, and calculate their net average
     */
    average = (divisor: number) => {
        this.r /= divisor;
        this.g /= divisor;
        this.b /= divisor;

        this.net = (this.r + this.g + this.b) / 3;
    }

    /**
     * Get the string respresentation to print
     */
    toString = () => {
        return `{r: ${this.r.toFixed(2)}, g: ${this.g.toFixed(2)}, b: ${this.b.toFixed(2)}, avg: ${this.net.toFixed(2)}}`;
    }
}