/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
const chai =require('chai');
chai.should();

const {Ed25519VerificationKey2020} =require( '../lib/index.js');
const {stringToUint8Array} =require( './text-encoder.js');
const StableLibEd25519 =require( '@stablelib/ed25519');
const {randomBytes} =require( 'node:crypto');

const {promisify} =require( 'node:util');

const randomBytesAsync = promisify(randomBytes);

describe('compatibility', () => {
  describe('node ed25519 keys', () => {
    it('should verify signature from @stablelib/ed25519', async () => {
      const seed = await randomBytesAsync(32);
      const data = stringToUint8Array('node key test');
      const {secretKey} = await StableLibEd25519.generateKeyPairFromSeed(seed);
      const signature = await StableLibEd25519.sign(secretKey, data);
      const libraryNodeKey = await Ed25519VerificationKey2020.generate({seed});
      const result = await libraryNodeKey.verifier().verify({data, signature});
      result.should.be.true;
    });
  });
  describe('@stablelib ed25519 keys', () => {
    it('should verify signature from node ed25519 keys', async () => {
      const data = stringToUint8Array('ed25519 key test');
      const seed = await randomBytesAsync(32);
      const libraryNodeKey = await Ed25519VerificationKey2020.generate({seed});
      const signature = await libraryNodeKey.signer().sign({data});
      const {publicKey} = await StableLibEd25519.generateKeyPairFromSeed(seed);
      const result = await StableLibEd25519.verify(
        publicKey, data, signature);
      result.should.be.true;
    });
  });
});
