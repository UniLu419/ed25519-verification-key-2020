/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
const chai =require('chai');
const base58btc =require('base58-universal');
const {mockKey, seed} =require('./mock-data.js');
const multibase =require('multibase');
const multicodec =require('multicodec');
const should = chai.should();
const {expect} = chai;

const {Ed25519VerificationKey2020} =require('../lib/index.js');
const {
  Ed25519VerificationKey2018
} =require('@digitalbazaar/ed25519-verification-key-2018');

// multibase base58-btc header
const MULTIBASE_BASE58BTC_HEADER = 'z';

describe('Ed25519VerificationKey2020', () => {
  describe('class', () => {
    it('should have suite and SUITE_CONTEXT properties', async () => {
      expect(Ed25519VerificationKey2020).to.have.property('suite',
        'Ed25519VerificationKey2020');
      expect(Ed25519VerificationKey2020).to.have.property('SUITE_CONTEXT',
        'https://w3id.org/security/suites/ed25519-2020/v1');
    });
  });

  describe('constructor', () => {
    it('should auto-set key.id based on controller', async () => {
      const {publicKeyMultibase} = mockKey;
      const controller = 'did:example:1234';

      const keyPair = new Ed25519VerificationKey2020(
        {controller, publicKeyMultibase});
      expect(keyPair.id).to.equal(
        'did:example:1234#z6MknCCLeeHBUaHu4aHSVLDCYQW9gjVJ7a63FpMvtuVMy53T');
    });

    it('should error if publicKeyMultibase property is missing', async () => {
      let error;
      try {
        new Ed25519VerificationKey2020({});
      } catch(e) {
        error = e;
      }
      expect(error).to.be.an.instanceof(TypeError);
      expect(error.message)
        .to.equal('The "publicKeyMultibase" property is required.');
    });
  });

  describe('generate', () => {
    it('should generate a key pair', async () => {
      let ldKeyPair;
      let error;
      try {
        ldKeyPair = await Ed25519VerificationKey2020.generate();
      } catch(e) {
        error = e;
      }

      should.not.exist(error);
      should.exist(ldKeyPair.privateKeyMultibase);
      should.exist(ldKeyPair.publicKeyMultibase);
      const privateKeyBytes = base58btc
        .decode(ldKeyPair.privateKeyMultibase.slice(1));
      const publicKeyBytes = base58btc
        .decode(ldKeyPair.publicKeyMultibase.slice(1));
      privateKeyBytes.length.should.equal(66);
      publicKeyBytes.length.should.equal(34);
    });

    it('should generate the same key from the same seed', async () => {
      const seed = new Uint8Array(32);
      seed.fill(0x01);
      const keyPair1 = await Ed25519VerificationKey2020.generate({seed});
      const keyPair2 = await Ed25519VerificationKey2020.generate({seed});
      expect(keyPair1.publicKeyMultibase).to.equal(keyPair2.publicKeyMultibase);
      expect(keyPair1.privateKeyMultibase).to
        .equal(keyPair2.privateKeyMultibase);
    });
  });

  describe('export', () => {
    it('should export id, type and key material', async () => {
      // Encoding returns a 64 byte uint8array, seed needs to be 32 bytes
      const seedBytes = (new TextEncoder()).encode(seed).slice(0, 32);
      const keyPair = await Ed25519VerificationKey2020.generate({
        seed: seedBytes, controller: 'did:example:1234'
      });
      const pastDate = new Date(2020, 11, 17).toISOString()
        .replace(/\.[0-9]{3}/, '');
      keyPair.revoked = pastDate;
      const exported = await keyPair.export({
        publicKey: true, privateKey: true
      });

      expect(exported).to.have.keys([
        'id', 'type', 'controller', 'publicKeyMultibase', 'privateKeyMultibase',
        'revoked'
      ]);

      expect(exported.controller).to.equal('did:example:1234');
      expect(exported.type).to.equal('Ed25519VerificationKey2020');
      expect(exported.id).to.equal('did:example:1234#' +
        'z6Mkpw72M9suPCBv48X2Xj4YKZJH9W7wzEK1aS6JioKSo89C');
      expect(exported).to.have.property('publicKeyMultibase',
        'z6Mkpw72M9suPCBv48X2Xj4YKZJH9W7wzEK1aS6JioKSo89C');
      expect(exported).to.have.property('privateKeyMultibase',
        'zrv1mHUXWkWUpThaapTt8tkxSotE1iSRRuPNarhs3vTn2z61hQESuKXG7zGQsePB7JHd' +
        'jaCzPZmBkkqULLvoLHoD82a');
      expect(exported).to.have.property('revoked', pastDate);
    });

    it('should only export public key if specified', async () => {
      const keyPair = await Ed25519VerificationKey2020.generate({
        id: 'did:ex:123#test-id'
      });
      const exported = await keyPair.export({publicKey: true});

      expect(exported).to.have.keys(['id', 'type', 'publicKeyMultibase']);
      expect(exported).to.have.property('id', 'did:ex:123#test-id');
      expect(exported).to.have.property('type', 'Ed25519VerificationKey2020');
    });
  });

  describe('static fromFingerprint', () => {
    it('should round-trip load keys', async () => {
      const keyPair = await Ed25519VerificationKey2020.generate();
      const fingerprint = keyPair.fingerprint();

      const newKey = Ed25519VerificationKey2020.fromFingerprint({fingerprint});
      expect(newKey.publicKeyMultibase).to.equal(keyPair.publicKeyMultibase);
    });
  });

  describe('static from', () => {
    it('should round-trip load exported keys', async () => {
      // Encoding returns a 64 byte uint8array, seed needs to be 32 bytes
      const seedBytes = (new TextEncoder()).encode(seed).slice(0, 32);
      const keyPair = await Ed25519VerificationKey2020.generate({
        seed: seedBytes, controller: 'did:example:1234'
      });
      const exported = await keyPair.export({
        publicKey: true, privateKey: true
      });
      const imported = await Ed25519VerificationKey2020.from(exported);

      expect(await imported.export({publicKey: true, privateKey: true}))
        .to.eql(exported);
    });
  });

  describe('fingerprint', () => {
    it('should create an Ed25519 key fingerprint', async () => {
      const keyPair = await Ed25519VerificationKey2020.generate();
      const fingerprint = keyPair.fingerprint();
      fingerprint.should.be.a('string');
      fingerprint.startsWith('z').should.be.true;
    });

    it('should be properly multicodec encoded', async () => {
      const keyPair = await Ed25519VerificationKey2020.generate();
      const fingerprint = keyPair.fingerprint();
      const mcPubkeyBytes = multibase.decode(fingerprint);
      const mcType = multicodec.getCodec(mcPubkeyBytes);
      mcType.should.equal('ed25519-pub');
      const pubkeyBytes =
        multicodec.addPrefix('ed25519-pub', multicodec.rmPrefix(mcPubkeyBytes));
      const encodedPubkey = MULTIBASE_BASE58BTC_HEADER +
        base58btc.encode(pubkeyBytes);
      encodedPubkey.should.equal(keyPair.publicKeyMultibase);
      expect(typeof keyPair.fingerprint()).to.equal('string');
    });
  });

  describe('verify fingerprint', () => {
    it('should verify a valid fingerprint', async () => {
      const keyPair = await Ed25519VerificationKey2020.generate();
      const fingerprint = keyPair.fingerprint();
      const result = keyPair.verifyFingerprint({fingerprint});
      expect(result).to.exist;
      result.should.be.an('object');
      expect(result.valid).to.exist;
      result.valid.should.be.a('boolean');
      result.valid.should.be.true;
    });

    it('should reject an improperly encoded fingerprint', async () => {
      const keyPair = await Ed25519VerificationKey2020.generate();
      const fingerprint = keyPair.fingerprint();
      const result = keyPair.verifyFingerprint(
        {fingerprint: fingerprint.slice(1)});
      expect(result).to.exist;
      result.should.be.an('object');
      expect(result.valid).to.exist;
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      expect(result.error).to.exist;
      result.error.message.should.equal(
        '"fingerprint" must be a multibase encoded string.');
    });

    it('should reject an invalid fingerprint', async () => {
      const keyPair = await Ed25519VerificationKey2020.generate();
      const fingerprint = keyPair.fingerprint();
      // reverse the valid fingerprint
      const t = fingerprint.slice(1).split('').reverse().join('');
      const badFingerprint = fingerprint[0] + t;
      const result = keyPair.verifyFingerprint({fingerprint: badFingerprint});
      expect(result).to.exist;
      result.should.be.an('object');
      expect(result.valid).to.exist;
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      expect(result.error).to.exist;
      result.error.message.should.equal(
        'The fingerprint does not match the public key.');
    });

    it('should reject a numeric fingerprint', async () => {
      const keyPair = await Ed25519VerificationKey2020.generate();
      const result = keyPair.verifyFingerprint({fingerprint: 123});
      expect(result).to.exist;
      result.should.be.an('object');
      expect(result.valid).to.exist;
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      expect(result.error).to.exist;
      result.error.message.should.equal(
        '"fingerprint" must be a multibase encoded string.');
    });

    it('should reject an improperly encoded fingerprint', async () => {
      const keyPair = await Ed25519VerificationKey2020.generate();
      const result = keyPair.verifyFingerprint({fingerprint: 'zPUBLICKEYINFO'});
      expect(result).to.exist;
      result.should.be.an('object');
      expect(result.valid).to.exist;
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      expect(result.error).to.exist;
      result.error.message.should.equal('Invalid encoding of fingerprint.');
    });

    it('generates the same fingerprint from the same seed', async () => {
      const seed = new Uint8Array(32);
      seed.fill(0x01);
      const keyPair1 = await Ed25519VerificationKey2020.generate({seed});
      const keyPair2 = await Ed25519VerificationKey2020.generate({seed});
      const fingerprint = keyPair1.fingerprint();
      const fingerprint2 = keyPair2.fingerprint();
      const result = keyPair2.verifyFingerprint({fingerprint});
      expect(result).to.exist;
      result.should.be.an('object');
      expect(result.valid).to.exist;
      result.valid.should.be.a('boolean');
      result.valid.should.be.true;
      fingerprint.should.equal(fingerprint2);
    });
  });

  describe('Backwards compat with Ed25519VerificationKey2018', () => {
    const seedBytes = (new TextEncoder()).encode(seed).slice(0, 32);

    it('2020 key should import from 2018', async () => {
      const keyPair2018 = await Ed25519VerificationKey2018.generate({
        seed: seedBytes, controller: 'did:example:1234'
      });

      const keyPair2020 = await Ed25519VerificationKey2020
        .fromEd25519VerificationKey2018({keyPair: keyPair2018});

      // Both should have the same fingerprint
      expect(keyPair2018.fingerprint()).to.equal(keyPair2020.fingerprint());

      // Both should sign and verify the same
      const data = (new TextEncoder()).encode('test data goes here');
      const signatureBytes2018 = await keyPair2018.signer().sign({data});

      const signatureBytes2020 = await keyPair2020.signer().sign({data});

      expect(signatureBytes2018).to.eql(signatureBytes2020);
      expect(
        await keyPair2020.verifier()
          .verify({data, signature: signatureBytes2018})
      ).to.be.true;
    });

    it('2020 key should generate the same from seed as 2018', async () => {
      const keyPair2018 = await Ed25519VerificationKey2018.generate({
        seed: seedBytes, controller: 'did:example:1234'
      });
      const keyPair2020 = await Ed25519VerificationKey2020.generate({
        seed: seedBytes, controller: 'did:example:1234'
      });

      const data = (new TextEncoder()).encode('test data goes here');
      const signatureBytes2018 = await keyPair2018.signer().sign({data});
      const signatureBytes2020 = await keyPair2020.signer().sign({data});
      expect(signatureBytes2018).to.eql(signatureBytes2020);
    });
  });

  describe('JsonWebKey2020', () => {
    it('round trip imports/exports', async () => {
      const keyData = {
        '@context': 'https://w3id.org/security/jws/v1',
        id: 'did:example:123#kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k',
        type: 'JsonWebKey2020',
        controller: 'did:example:123',
        publicKeyJwk: {
          kty: 'OKP',
          crv: 'Ed25519',
          x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo'
        }
      };

      const key = await Ed25519VerificationKey2020.from(keyData);

      expect(key.controller).to.equal('did:example:123');
      expect(key.id).to
        .equal('did:example:123#kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k');
      expect(key.publicKeyMultibase).to
        .equal('z6MktwupdmLXVVqTzCw4i46r4uGyosGXRnR3XjN4Zq7oMMsw');

      const exported = await key.toJsonWebKey2020();

      expect(exported).to.eql(keyData);
    });

    it('computes jwk thumbprint', async () => {
      const keyData = {
        id: 'did:example:123#_Qq0UL2Fq651Q0Fjd6TvnYE-faHiOpRlPVQcY_-tA4A',
        type: 'JsonWebKey2020',
        controller: 'did:example:123',
        publicKeyJwk: {
          kty: 'OKP',
          crv: 'Ed25519',
          x: 'VCpo2LMLhn6iWku8MKvSLg2ZAoC-nlOyPVQaO3FxVeQ'
        }
      };

      const key = await Ed25519VerificationKey2020.from(keyData);

      expect(await key.jwkThumbprint()).to
        .equal('_Qq0UL2Fq651Q0Fjd6TvnYE-faHiOpRlPVQcY_-tA4A');
    });
  });
});
