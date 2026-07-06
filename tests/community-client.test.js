import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHostedCommunityClient,
  HostedCommunityClient
} from '@microwavedev/backpack-game-core/modules/community';

test('[community-client] reports unavailable hosted surfaces without a server URL', async () => {
  const client = createHostedCommunityClient({ runtimeMode: 'local' });

  assert.ok(client instanceof HostedCommunityClient);
  assert.deepEqual(client.status(), {
    runtimeMode: 'local',
    configured: false,
    communityServerUrl: null,
    readOnly: true,
    surfaces: {
      leaderboard: false,
      friends: false,
      challenges: false,
      accountLinking: false,
      sharedSeasons: false
    }
  });
  assert.deepEqual(await client.leaderboard(), {
    available: false,
    source: 'unconfigured',
    entries: []
  });
});

test('[community-client] reads hosted leaderboard entries from configurable endpoints', async () => {
  let requestedUrl = null;
  const client = createHostedCommunityClient({
    runtimeMode: 'local',
    communityServerUrl: 'https://community.example.test/base/',
    endpoints: {
      leaderboard: '/community/leaderboard'
    },
    surfaces: {
      friends: true
    },
    fetchImpl: async (url, options) => {
      requestedUrl = String(url);
      assert.equal(options.headers.accept, 'application/json');
      return {
        ok: true,
        json: async () => ({
          data: {
            entries: [{ id: 'player-a', rating: 1400 }]
          }
        })
      };
    }
  });

  assert.equal(client.status().surfaces.leaderboard, true);
  assert.equal(client.status().surfaces.friends, true);
  const leaderboard = await client.leaderboard();
  assert.equal(requestedUrl, 'https://community.example.test/community/leaderboard');
  assert.deepEqual(leaderboard, {
    available: true,
    source: 'hosted',
    entries: [{ id: 'player-a', rating: 1400 }]
  });
});

test('[community-client] turns hosted failures into upstream errors', async () => {
  const client = createHostedCommunityClient({
    communityServerUrl: 'https://community.example.test',
    fetchImpl: async () => ({ ok: false, status: 503 })
  });

  await assert.rejects(
    () => client.leaderboard(),
    (error) => error.status === 502 && /leaderboard request failed with 503/.test(error.message)
  );
});
