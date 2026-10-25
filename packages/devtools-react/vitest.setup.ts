import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

expect.extend(matchers);

import { afterEach, beforeEach } from 'vitest';
beforeEach(() => localStorage.clear());
import { cleanup } from '@testing-library/react';
afterEach(cleanup);
