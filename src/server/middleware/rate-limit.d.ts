export interface RateLimitOptions {
  capacity?: number;
  refillPerSec?: number;
  force?: boolean;
  keyFn?: (req: any) => string | null | undefined;
}

export declare function rateLimit(options?: RateLimitOptions): (req: any, res: any, next: () => void) => void;
export declare function clearRateLimitBuckets(): void;
