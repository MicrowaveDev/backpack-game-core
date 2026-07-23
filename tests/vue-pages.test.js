import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CharactersScreen,
  LeaderboardScreen,
  OnboardingScreen,
  SettingsScreen
} from '@microwavedev/backpack-game-core/vue/pages';

test('[vue/pages] common account pages expose product-neutral contracts', () => {
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
});
