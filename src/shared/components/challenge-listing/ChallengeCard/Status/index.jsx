import config from 'utils/config';
import React, { Component } from 'react';
import PT from 'prop-types';
import moment from 'moment';
import LeaderboardAvatar from 'components/LeaderboardAvatar';
import Tooltip from 'components/Tooltip';
import { Link } from 'react-router-dom';

import ChallengeProgressBar from '../../ChallengeProgressBar';
import ProgressBarTooltip from '../../Tooltips/ProgressBarTooltip';
import RegistrantsIcon from '../../Icons/RegistrantsIcon';
import SubmissionsIcon from '../../Icons/SubmissionsIcon';
import UserAvatarTooltip from '../../Tooltips/UserAvatarTooltip';
import ForumIcon from '../../Icons/forum.svg';
import './style.scss';

// Constants
const ID_LENGTH = 6;
const MAX_VISIBLE_WINNERS = 3;
const STALLED_MSG = 'Stalled';
const DRAFT_MSG = 'In Draft';
const STALLED_TIME_LEFT_MSG = 'Challenge is currently on hold';
const FF_TIME_LEFT_MSG = 'Winner is working on fixes';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const getTimeLeft = (date, currentPhase) => {
  if (!currentPhase || currentPhase === 'Stalled') {
    return {
      late: false,
      text: STALLED_TIME_LEFT_MSG,
    };
  } else if (currentPhase === 'Final Fix') {
    return {
      late: false,
      text: FF_TIME_LEFT_MSG,
    };
  }

  let time = moment(date).diff();
  const late = time < 0;
  if (late) time = -time;

  let format;
  if (time > DAY_MS) format = 'DDD[d] H[h]';
  else if (time > HOUR_MS) format = 'H[h] m[min]';
  else format = 'm[min] s[s]';

  time = moment(time).format(format);
  time = late ? `Late by ${time}` : `${time} to go`;
  return { late, text: time };
};

function numRegistrantsTipText(number) {
  switch (number) {
    case 0: return 'No registrants';
    case 1: return '1 total registrant';
    default: return `${number} total registrants`;
  }
}

function numSubmissionsTipText(number) {
  switch (number) {
    case 0: return 'No submissions';
    case 1: return '1 total submission';
    default: return `${number} total submissions`;
  }
}

const getStatusPhase = (challenge) => {
  const { currentPhases } = challenge;
  const currentPhase = currentPhases.length > 0 ? currentPhases[0] : '';
  const currentPhaseName = currentPhase ? currentPhase.phaseType : '';
  switch (currentPhaseName) {
    case 'Registration': {
      if (challenge.checkpointSubmissionEndDate && !getTimeLeft(challenge.checkpointSubmissionEndDate, 'Checkpoint').late) {
        return {
          currentPhaseName: 'Checkpoint',
          currentPhaseEndDate: challenge.checkpointSubmissionEndDate,
        };
      }

      return {
        currentPhaseName: 'Submission',
        currentPhaseEndDate: challenge.submissionEndDate,
      };
    }
    case 'Submission': {
      if (challenge.checkpointSubmissionEndDate && !getTimeLeft(challenge.checkpointSubmissionEndDate, 'Checkpoint').late) {
        return {
          currentPhaseName: 'Checkpoint',
          currentPhaseEndDate: challenge.checkpointSubmissionEndDate,
        };
      }

      return {
        currentPhaseName: 'Submission',
        currentPhaseEndDate: challenge.submissionEndDate,
      };
    }
    default:
      return {
        currentPhaseName,
        currentPhaseEndDate: currentPhase.scheduledEndTime,
      };
  }
};

const getTimeToGo = (start, end) => {
  const percentageComplete = (
    (moment() - moment(start)) / (moment(end) - moment(start))
  ) * 100;
  return (Math.round(percentageComplete * 100) / 100);
};


/**
 * Returns an user profile object as expected by the UserAvatarTooltip
 * @param {String} handle
 */
function getProfile(user) {
  const { handle, placement } = user;
  const photoLink = user.photoURL;
  return {
    handle,
    placement,
    country: '',
    memberSince: '',
    photoLink,
    ratingSummary: [],
  };
}

class ChallengeStatus extends Component {
  constructor(props) {
    super(props);
    const CHALLENGE_URL = `${config.URL.BASE}/challenge-details/`;
    const DS_CHALLENGE_URL = `${config.URL.COMMUNITY}/longcontest/stats/?module=ViewOverview&rd=`;
    const FORUM_URL = `${config.URL.FORUMS}/?module=Category&categoryID=`;
    this.state = {
      winners: '',
      CHALLENGE_URL,
      DS_CHALLENGE_URL,
      FORUM_URL,
    };
    this.registrantsLink = this.registrantsLink.bind(this);
  }

  /* TODO: Here is many code common with activeChallenge (the difference is that
   * one component renders leaderboard gallery in the place where another one
   * renders the timeline). The code should be refactored to avoid dublicating
   * the common code being used in both places. */
  completedChallenge() {
    const { challenge } = this.props;
    const { CHALLENGE_URL, FORUM_URL } = this.state;
    return (
      <div>
        {this.renderLeaderboard()}
        <span styleName="challenge-stats">
          <span styleName="num-reg">
            <Tooltip
              content={
                <div styleName="num-reg-tooltip">
                  {numRegistrantsTipText(challenge.numRegistrants)}
                </div>
              }
            >
              <a styleName="num-reg past" href={`${CHALLENGE_URL}${challenge.id}/?type=${challenge.track.toLowerCase()}#viewRegistrant`}>
                <RegistrantsIcon /> <span styleName="number">{challenge.numRegistrants}</span>
              </a>
            </Tooltip>
          </span>
          <span styleName="num-sub">
            <Tooltip
              content={
                <div styleName="num-reg-tooltip">
                  {numSubmissionsTipText(challenge.numSubmissions)}
                </div>
              }
            >
              <a styleName="num-sub past" href={`${CHALLENGE_URL}${challenge.id}/?type=${challenge.track.toLowerCase()}#viewRegistrant`}>
                <SubmissionsIcon /> <span styleName="number">{challenge.numSubmissions}</span>
              </a>
            </Tooltip>
          </span>
          {
            challenge.myChallenge &&
            <span>
              <a styleName="link-forum past" href={`${FORUM_URL}${challenge.forumId}`}><ForumIcon /></a>
            </span>
          }
        </span>
      </div>
    );
  }

  activeChallenge() {
    const { challenge } = this.props;
    const { FORUM_URL } = this.state;
    const MM_LONGCONTEST = `${config.URL.COMMUNITY}/longcontest/?module`;
    const MM_REG = `${MM_LONGCONTEST}=ViewRegistrants&rd=`;
    const MM_SUB = `${MM_LONGCONTEST}=ViewStandings&rd=`;

    const registrationPhase = challenge.allPhases.filter(phase => phase.phaseType === 'Registration')[0];
    const isRegistrationOpen = registrationPhase ? registrationPhase.phaseStatus === 'Open' : false;
    const currentPhaseName = challenge.currentPhases && challenge.currentPhases.length > 0;

    let phaseMessage = STALLED_MSG;
    if (currentPhaseName) {
      phaseMessage = getStatusPhase(challenge).currentPhaseName;
    } else if (challenge.status === 'DRAFT') {
      phaseMessage = DRAFT_MSG;
    }
    return (
      <div styleName={isRegistrationOpen ? 'challenge-progress with-register-button' : 'challenge-progress'}>
        <span styleName="current-phase">
          { phaseMessage }
        </span>
        <span styleName="challenge-stats">
          <span styleName="num-reg">
            <Tooltip
              content={
                <div styleName="num-reg-tooltip">
                  {numRegistrantsTipText(challenge.numRegistrants)}
                </div>
              }
            >
              <a styleName="num-reg" href={this.registrantsLink(challenge, MM_REG)}>
                <RegistrantsIcon />
                <span styleName="number">{challenge.numRegistrants}</span>
              </a>
            </Tooltip>
          </span>
          <span styleName="num-sub">
            <Tooltip
              content={
                <div styleName="num-reg-tooltip">
                  {numSubmissionsTipText(challenge.numSubmissions)}
                </div>
              }
            >
              <a styleName="num-sub" href={this.registrantsLink(challenge, MM_SUB)}>
                <SubmissionsIcon /> <span styleName="number">{challenge.numSubmissions}</span>
              </a>
            </Tooltip>
          </span>
          {
            challenge.myChallenge &&
            <span>
              <a styleName="link-forum" href={`${FORUM_URL}${challenge.forumId}`}>
                <ForumIcon />
              </a>
            </span>
          }
        </span>
        <ProgressBarTooltip challenge={challenge}>
          {
            challenge.status === 'ACTIVE' && challenge.currentPhases.length > 0 ?
              <div>
                <ChallengeProgressBar
                  color="green"
                  value={
                    getTimeToGo(
                      challenge.registrationStartDate,
                      getStatusPhase(challenge).currentPhaseEndDate,
                    )
                  }
                  isLate={
                    getTimeLeft(
                      getStatusPhase(challenge).currentPhaseEndDate,
                      getStatusPhase(challenge).currentPhaseName,
                    ).late
                  }
                />
                <div styleName="time-left">
                  {
                    getTimeLeft(
                      getStatusPhase(challenge).currentPhaseEndDate,
                      getStatusPhase(challenge).currentPhaseName,
                    ).text
                  }
                </div>
              </div>
              :
              <ChallengeProgressBar color="gray" value="100" />
          }
        </ProgressBarTooltip>
        {isRegistrationOpen && this.renderRegisterButton()}
      </div>
    );
  }

  registrantsLink(registrantsChallenge, type) {
    const { CHALLENGE_URL } = this.state;
    if (registrantsChallenge.track === 'DATA_SCIENCE') {
      const id = `${registrantsChallenge.id}`;
      if (id.length < ID_LENGTH) {
        return `${type}${registrantsChallenge.id}`;
      }
      return `${CHALLENGE_URL}${registrantsChallenge.id}/?type=develop#viewRegistrant`;
    }
    return `${CHALLENGE_URL}${registrantsChallenge.id}/?type=${registrantsChallenge.track.toLowerCase()}#viewRegistrant`;
  }

  renderRegisterButton() {
    const {
      challenge,
      detailLink,
      openChallengesInNewTabs,
    } = this.props;
    const timeDiff = getTimeLeft(
      challenge.registrationEndDate || challenge.submissionEndDate,
      challenge.currentPhases[0] ? challenge.currentPhases[0].phaseType : '',
    );
    let timeNote = timeDiff.text;
    /* TODO: This is goofy, makes the trick, but should be improved. The idea
     * here is that the standard "getTimeLeft" method, for positive times,
     * generates a string like "H MM to go"; here we want to render just
     * H MM part, so we cut the last 6 symbols. Not a good code. */
    if (!timeDiff.late) {
      timeNote = timeNote.substring(0, timeNote.length - 6);
    }
    return (
      <a
        href={detailLink}
        onClick={() => false}
        styleName="register-button"
        target={openChallengesInNewTabs ? '_blank' : undefined}
      >
        <span>
          { timeNote }
        </span>
        <span styleName="to-register">to register</span>
      </a>
    );
  }

  renderLeaderboard() {
    const { challenge, openChallengesInNewTabs } = this.props;

    let winners = challenge.winners && challenge.winners.filter(winner => winner.type === 'final')
      .map(winner => ({
        handle: winner.handle,
        position: winner.placement,
        photoURL: winner.photoURL,
      }));

    if (winners && winners.length > MAX_VISIBLE_WINNERS) {
      const lastItem = {
        handle: `+${winners.length - MAX_VISIBLE_WINNERS}`,
        isLastItem: true,
      };
      winners = winners.slice(0, MAX_VISIBLE_WINNERS);
      winners.push(lastItem);
    }
    const leaderboard = winners && winners.map((winner) => {
      if (winner.isLastItem) {
        return (
          /* TODO: No, should not reuse avatar for displaying "+1" in
           * a circle. Should be a separate component for that. */
          <LeaderboardAvatar
            key={winner.handle}
            member={winner}
            openNewTab={openChallengesInNewTabs}
            url={`${this.props.detailLink}&tab=winners`}
            plusOne
          />
        );
      }
      const userProfile = getProfile(winner);
      return (
        <div styleName="avatar-container" key={winner.handle}>
          <UserAvatarTooltip user={userProfile}>
            <LeaderboardAvatar member={winner} />
          </UserAvatarTooltip>
        </div>);
    });
    return leaderboard || (
      <Link to={`${this.props.detailLink}&tab=submissions`}>Results</Link>
    );
  }

  render() {
    const { challenge } = this.props;
    const status = challenge.status === 'COMPLETED' ? 'completed' : '';
    return (
      <div styleName={`challenge-status ${status}`}>
        {challenge.status === 'COMPLETED' ? this.completedChallenge() : this.activeChallenge()}
      </div>
    );
  }
}

ChallengeStatus.defaultProps = {
  challenge: {},
  detailLink: '',
  openChallengesInNewTabs: false,
};

ChallengeStatus.propTypes = {
  challenge: PT.shape(),
  detailLink: PT.string,
  openChallengesInNewTabs: PT.bool,
};

export default ChallengeStatus;
