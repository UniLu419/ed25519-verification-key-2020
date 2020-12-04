/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import * as ed25519 from '@stablelib/ed25519';
import {randomBytes} from '@stablelib/random';

export default {
  // use stablelib's randomBytes in the browser
  randomBytes,
  ...ed25519
};