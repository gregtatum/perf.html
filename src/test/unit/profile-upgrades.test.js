/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import {
  unserializeProfileOfArbitraryFormat,
  serializeProfile,
} from '../../profile-logic/process-profile';
import {
  isOldCleopatraFormat,
  convertOldCleopatraProfile,
} from '../../profile-logic/old-cleopatra-profile-format';
import {
  isProcessedProfile,
  upgradeProcessedProfileToCurrentVersion,
  CURRENT_PROCESSED_VERSION,
} from '../../profile-logic/processed-profile-versioning';
import {
  upgradeGeckoProfileToCurrentVersion,
  CURRENT_GECKO_VERSION,
} from '../../profile-logic/gecko-profile-versioning';

/**
 * This only lightly tests our conversion of old cleopatra formats to see that they
 * don't throw exceptions.
 */
describe('upgrade old cleopatra profiles', function() {
  [
    require('../fixtures/upgrades/old-cleopatra-profile.sps.json'),
    require('../fixtures/upgrades/ancient-cleopatra-profile.sps.json'),
  ].forEach((cleopatraProfile: Object) => {
    it('should detect the profile as an old cleopatra profile', function() {
      expect(isOldCleopatraFormat(cleopatraProfile)).toBe(true);
    });
    it('should be able to convert the old cleopatra profile into a processed profile', function() {
      const processedProfile = convertOldCleopatraProfile(cleopatraProfile);
      expect(isProcessedProfile(processedProfile)).toBe(true);
      // For now, just test that upgrading doesn't throw any exceptions.
      upgradeProcessedProfileToCurrentVersion(processedProfile);
      expect(processedProfile.threads.length).toBeGreaterThanOrEqual(1);
      expect(processedProfile.threads[0].name).toBe('GeckoMain');
    });
  });
});

describe('upgrade processed profiles', function() {
  let profilesTested = 0;
  function matchesSnapshot(version: number, serializedProfile: Object) {
    it(`upgrades profile-${version}.json to the current processProfile format`, function() {
      const processedProfile: Object = unserializeProfileOfArbitraryFormat(
        serializedProfile
      );
      delete processedProfile.meta.version;
      expect(processedProfile).toMatchSnapshot('upgraded-process-profile');
      profilesTested++;
    });
  }

  matchesSnapshot(7, require('../fixtures/upgrades/processed-7.json'));
  matchesSnapshot(6, require('../fixtures/upgrades/processed-6.json'));
  matchesSnapshot(5, require('../fixtures/upgrades/processed-5.json'));
  matchesSnapshot(4, require('../fixtures/upgrades/processed-4.json'));
  matchesSnapshot(3, require('../fixtures/upgrades/processed-3.json'));
  matchesSnapshot(2, require('../fixtures/upgrades/processed-2.json'));
  matchesSnapshot(1, require('../fixtures/upgrades/processed-1.json'));
  matchesSnapshot(0, require('../fixtures/upgrades/processed-0.json'));

  /**
   * If this test fails, then a new processed-x.json needs to be added. Run the
   * following console.log to output a new one, then manually run it through
   * JSON.stringify(output, null, 2) to pretty print the output.
   */
  it('tests every processed profile', function() {
    // console.log(
    //   serializeProfile(
    //     unserializeProfileOfArbitraryFormat(
    //       require('../fixtures/upgrades/processed-7.json')
    //     )
    //   )
    // );

    expect(CURRENT_PROCESSED_VERSION + 1).toBe(profilesTested);
  });
});

fdescribe('upgrade gecko profiles version 3 and above', function() {
  let profilesTested = 0;
  function matchesSnapshot(version: number, geckoProfile: Object) {
    it(`upgrades "gecko-${version}.json" to the current processProfile format`, function() {
      upgradeGeckoProfileToCurrentVersion(geckoProfile);
      expect(geckoProfile).toMatchSnapshot('upgraded-gecko-profile');
      profilesTested++;
    });
  }

  // Uncomment this to output your next ./upgrades/gecko-X.json
  // upgradeGeckoProfileToCurrentVersion(afterUpgradeGeckoReference);
  // console.log(JSON.stringify(afterUpgradeGeckoReference));

  matchesSnapshot(7, require('../fixtures/upgrades/gecko-7.json'));
  matchesSnapshot(6, require('../fixtures/upgrades/gecko-6.json'));
  matchesSnapshot(5, require('../fixtures/upgrades/gecko-5.json'));
  matchesSnapshot(4, require('../fixtures/upgrades/gecko-4.json'));
  matchesSnapshot(3, require('../fixtures/upgrades/gecko-3.json'));

  /**
   * If this test fails, then a new processed-x.json needs to be added. Run the
   * following console.log to output a new one, then manually run it through
   * JSON.stringify(output, null, 2) to pretty print the output.
   */
  it('tests every gecko profile version', function() {
    // console.log(
    //   serializeProfile(
    //     unserializeProfileOfArbitraryFormat(
    //       require('../fixtures/upgrades/processed-7.json')
    //     )
    //   )
    // );

    const expectedProfilesTested = CURRENT_GECKO_VERSION - 2;
    expect(expectedProfilesTested).toBe(profilesTested);
  });
});
