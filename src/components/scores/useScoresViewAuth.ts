import { useCallback } from "react";
import type { PerformanceWithScores, ScoreView } from "../../types/contest";
import { myScoreFor, readScoresAuth } from "./scoresViewShared";
import type { ScoresViewProps } from "./scoresViewShared";

export function useScoresViewAuth({
  isAuthenticated,
  votingStarted,
  votingEnded,
}: Pick<ScoresViewProps, "isAuthenticated" | "votingStarted" | "votingEnded">) {
  const { token, myUsername, myUserId } = readScoresAuth();
  const isLoggedIn = isAuthenticated && !!token;
  const canVote = isLoggedIn && votingStarted && !votingEnded;
  const showMyColumn = isLoggedIn;

  const findMyScore = useCallback(
    (p: PerformanceWithScores): ScoreView | undefined =>
      myScoreFor(p, { isLoggedIn, myUserId, myUsername }),
    [isLoggedIn, myUserId, myUsername]
  );

  const isMyUserCol = useCallback(
    (uid: string, username: string) =>
      isLoggedIn &&
      (uid === myUserId || (!!myUsername && username === myUsername)),
    [isLoggedIn, myUserId, myUsername]
  );

  return {
    token,
    myUsername,
    myUserId,
    isLoggedIn,
    canVote,
    showMyColumn,
    myScoreFor: findMyScore,
    isMyUserCol,
  };
}
