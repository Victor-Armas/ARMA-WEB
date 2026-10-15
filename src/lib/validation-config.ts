import { z } from "zod";

// Load before application schemas so validation works with a strict no-eval CSP.
z.config({ jitless: true });
