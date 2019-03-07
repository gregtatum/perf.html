/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import * as React from 'react';
import ArrowPanel from '../../shared/ArrowPanel';
import ButtonWithPanel from '../../shared/ButtonWithPanel';

type Props = {|
  +buttonClassName: string,
  +shareLabel: string,
  +okButtonClickEvent: () => mixed,
  +panelOpenEvent?: () => void,
  +PIIListToBeRemoved: Set<string>,
  +PIICheckboxesOnChange: (SyntheticEvent<HTMLInputElement>) => void,
|};

export class ProfileSharingButton extends React.PureComponent<Props> {
  render() {
    const {
      buttonClassName,
      shareLabel,
      okButtonClickEvent,
      panelOpenEvent,
      PIIListToBeRemoved,
      PIICheckboxesOnChange,
    } = this.props;
    return (
      <ButtonWithPanel
        className={buttonClassName}
        label={shareLabel}
        panel={
          <ArrowPanel
            className="menuButtonsPrivacyPanel"
            // title="Upload Profile – Privacy Notice"
            // okButtonText="Share"
            // cancelButtonText="Cancel"
            // onOkButtonClick={okButtonClickEvent}
            onOpen={panelOpenEvent ? panelOpenEvent : undefined}
          >
            <div className="menuButtonsPrivacyContent">
              <div className="menuButtonsPrivacyIcon" />
              <p className="menuButtonsPrivacyInfoDescription">
                You’re about to share your profile potentially where others have
                public access to it. By default, the profile is stripped of much
                of the personally identifiable information.
              </p>
              <details className="menuButtonsPrivacyData">
                <summary className="menuButtonsPrivacyDataSummary">
                  Select more data to include
                </summary>
                <label className="menuButtonsPrivacyDataLabel menuButtonsPrivacyDataLabelAll">
                  <input
                    className="menuButtonsPrivacyDataLabelAllInput"
                    type="checkbox"
                    value="all"
                  />
                  Include all information
                </label>
                <div className="menuButtonsPrivacyDataColumns">
                  <div className="menuButtonsPrivacyDataColumn">
                    <label className="menuButtonsPrivacyDataLabel">
                      <input
                        type="checkbox"
                        checked={!PIIListToBeRemoved.has('hiddenThreads')}
                        // eslint-disable-next-line react/jsx-no-bind
                        onChange={event =>
                          PIICheckboxesOnChange(event, 'hiddenThreads')
                        }
                      />
                      Include hidden threads
                    </label>
                    <label className="menuButtonsPrivacyDataLabel">
                      <input
                        type="checkbox"
                        checked={!PIIListToBeRemoved.has('timeRange')}
                        // eslint-disable-next-line react/jsx-no-bind
                        onChange={event =>
                          PIICheckboxesOnChange(event, 'timeRange')
                        }
                      />
                      Include full time range
                    </label>
                    <label className="menuButtonsPrivacyDataLabel">
                      <input
                        type="checkbox"
                        checked={!PIIListToBeRemoved.has('screenshots')}
                        // eslint-disable-next-line react/jsx-no-bind
                        onChange={event =>
                          PIICheckboxesOnChange(event, 'screenshots')
                        }
                      />
                      Include screenshots
                    </label>
                  </div>
                  <div className="menuButtonsPrivacyDataColumn">
                    <label className="menuButtonsPrivacyDataLabel">
                      <input
                        type="checkbox"
                        checked={!PIIListToBeRemoved.has('networkUrls')}
                        // eslint-disable-next-line react/jsx-no-bind
                        onChange={event =>
                          PIICheckboxesOnChange(event, 'networkUrls')
                        }
                      />
                      Include network traffic URLs
                    </label>
                    <label className="menuButtonsPrivacyDataLabel">
                      <input
                        type="checkbox"
                        checked={!PIIListToBeRemoved.has('allUrls')}
                        // eslint-disable-next-line react/jsx-no-bind
                        onChange={event =>
                          PIICheckboxesOnChange(event, 'allUrls')
                        }
                      />
                      Include All profile URLs
                    </label>
                    <label className="menuButtonsPrivacyDataLabel">
                      <input
                        type="checkbox"
                        checked={!PIIListToBeRemoved.has('extensions')}
                        // eslint-disable-next-line react/jsx-no-bind
                        onChange={event =>
                          PIICheckboxesOnChange(event, 'extensions')
                        }
                      />
                      Include Extensions
                    </label>
                  </div>
                </div>
              </details>
              <div className="menuButtonsPrivacyButtons">
                <div
                  aria-role="button"
                  className="menuButtonsPrivacyButton menuButtonsPrivacyButtonsUpload"
                  // eslint-disable-next-line react/jsx-no-bind
                  onClick={() => okButtonClickEvent()}
                >
                  <span className="menuButtonsPrivacyButtonsSvg menuButtonsPrivacyButtonsSvgUpload" />
                  Upload
                </div>
                <div
                  aria-role="button"
                  className="menuButtonsPrivacyButton menuButtonsPrivacyButtonsDownload"
                >
                  <span className="menuButtonsPrivacyButtonsSvg menuButtonsPrivacyButtonsSvgDownload" />
                  Download
                </div>
                <div
                  aria-role="button"
                  className="menuButtonsPrivacyButton menuButtonsPrivacyButtonsCancel"
                >
                  <span className="menuButtonsPrivacyButtonsSvg menuButtonsPrivacyButtonsSvgCancel" />
                  Cancel
                </div>
              </div>
            </div>
          </ArrowPanel>
        }
      />
    );
  }
}
