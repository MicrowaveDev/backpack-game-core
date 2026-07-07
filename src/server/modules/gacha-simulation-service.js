import {
  createAssetGachaSimulationService
} from '../../modules/gacha/simulation-service.js';

export function createServerGachaSimulationService({
  defaultPlanAssetVisibility = 'runtime',
  ...providers
} = {}) {
  const simulationService = createAssetGachaSimulationService(providers);

  return {
    simulateAssetPackOdds(packId, options = {}) {
      return simulationService.simulateAssetPackOdds(packId, options);
    },

    simulateRuntimeAssetPackOdds(packId, {
      planAssetVisibility = defaultPlanAssetVisibility,
      ...options
    } = {}) {
      return simulationService.simulateRuntimeAssetPackOdds(packId, {
        ...options,
        planAssetVisibility
      });
    }
  };
}
