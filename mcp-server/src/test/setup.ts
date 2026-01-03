/**
 * Test setup file for Vitest
 *
 * This file runs before all tests to configure the test environment.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });
