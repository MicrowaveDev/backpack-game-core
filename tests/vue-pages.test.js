import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AuthScreen,
  CharactersScreen,
  FriendsScreen,
  HomeScreen,
  HistoryScreen,
  LeaderboardScreen,
  OnboardingScreen,
  ProfileScreen,
  ReplayDetailScreen,
  RecipesScreen,
  SettingsScreen,
  SupportAdminScreen
} from '@microwavedev/backpack-game-core/vue/pages';

test('[vue/pages] common account pages expose product-neutral contracts', () => {
  assert.equal(AuthScreen.name, 'AuthScreen');
  assert.match(AuthScreen.template, /data-character-id/);
  assert.match(AuthScreen.template, /portraitAttributes/);
  assert.doesNotMatch(AuthScreen.template, /mushroom|spore|meat/i);
  assert.equal(OnboardingScreen.name, 'OnboardingScreen');
  assert.match(OnboardingScreen.template, /characters/);
  assert.match(OnboardingScreen.template, /\$emit\('continue'\)/);
  assert.doesNotMatch(OnboardingScreen.template, /mushroom|spore|meat/i);

  assert.equal(CharactersScreen.name, 'CharactersScreen');
  assert.match(CharactersScreen.template, /select-character/);
  assert.doesNotMatch(CharactersScreen.template, /mushroom|spore|meat/i);

  assert.equal(LeaderboardScreen.name, 'LeaderboardScreen');
  assert.match(LeaderboardScreen.template, /entry\.rating/);

  assert.equal(SettingsScreen.name, 'SettingsScreen');
  assert.match(SettingsScreen.template, /update:reduced-motion/);
  assert.match(SettingsScreen.template, /update:mobile-actions-mode/);

  assert.equal(FriendsScreen.name, 'FriendsScreen');
  assert.match(FriendsScreen.template, /challenge-friend/);
  assert.match(FriendsScreen.template, /shareFriendInvite/);
  assert.doesNotMatch(FriendsScreen.template, /mushroom|spore|mycel|telegram|meat/i);

  assert.equal(RecipesScreen.name, 'RecipesScreen');
  assert.match(RecipesScreen.template, /slot name="catalog"/);
  assert.match(RecipesScreen.template, /recipes-screen/);
  assert.doesNotMatch(RecipesScreen.template, /mushroom|spore|mycel|telegram|meat/i);

  assert.equal(ProfileScreen.name, 'ProfileScreen');
  assert.match(ProfileScreen.template, /profile-character-rows/);
  assert.match(ProfileScreen.template, /achievement-journal/);
  assert.doesNotMatch(ProfileScreen.template, /mushroom|spore|mycel|telegram|meat/i);

  assert.equal(HistoryScreen.name, 'HistoryScreen');
  assert.match(HistoryScreen.template, /open\(run\)/);
  assert.match(HistoryScreen.template, /@keydown\.enter/);
  assert.doesNotMatch(HistoryScreen.template, /mushroom|spore|mycel|telegram|meat/i);

  assert.equal(HomeScreen.name, 'HomeScreen');
  assert.match(HomeScreen.template, /home-character-list/);
  assert.match(HomeScreen.template, /characterPickerCompatibilityClass/);
  assert.match(HomeScreen.template, /home-social-sidebar/);
  assert.doesNotMatch(HomeScreen.template, /mushroom|spore|mycel|telegram|meat/i);

  assert.equal(ReplayDetailScreen.name, 'ReplayDetailScreen');
  assert.match(ReplayDetailScreen.template, /core-replay-screen/);
  assert.match(ReplayDetailScreen.template, /replayDuelComponent/);
  assert.doesNotMatch(ReplayDetailScreen.template, /mushroom|spore|mycel|telegram|meat/i);

  assert.equal(SupportAdminScreen.name, 'SupportAdminScreen');
  assert.equal(typeof SupportAdminScreen.props.request, 'object');
  assert.match(SupportAdminScreen.template, /gacha-season-plan/);
  assert.doesNotMatch(SupportAdminScreen.template, /mushroom|spore|mycel|meat/i);
});

test('[vue/pages] friends page delegates provider and browser behavior to adapters', async () => {
  const profile = { id: 'profile_1', friendCode: 'ALLY42' };
  const buildInviteLink = (candidate) => `https://example.test/invite/${candidate.friendCode}`;
  const context = {
    profile,
    labels: {
      friendInviteText: 'Use {code} at {link}',
      challengeStatuses: { pending: 'Waiting' }
    },
    buildInviteLink,
    copyText: async (text) => text,
    shareInvite: async (payload) => payload,
    copyResetDelay: 1,
    copyState: null,
    inviteLink: FriendsScreen.methods.inviteLink,
    inviteText: FriendsScreen.methods.inviteText
  };

  assert.equal(FriendsScreen.methods.inviteLink.call(context), 'https://example.test/invite/ALLY42');
  assert.equal(
    FriendsScreen.methods.inviteText.call(context),
    'Use ALLY42 at https://example.test/invite/ALLY42'
  );
  assert.equal(FriendsScreen.methods.challengeStatusLabel.call(context, 'pending'), 'Waiting');
  assert.equal(FriendsScreen.methods.challengeStatusLabel.call(context, 'unknown'), 'unknown');
});
