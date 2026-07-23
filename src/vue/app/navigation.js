export function createNavigationItems(registry, context = {}) {
  if (!registry || typeof registry.list !== 'function') {
    throw new TypeError('A screen registry is required to create navigation');
  }

  return Object.freeze(
    registry.list({ context })
      .filter((screen) => screen.navigation && screen.navigation.hidden !== true)
      .map((screen, index) => Object.freeze({
        ...screen.navigation,
        id: screen.id,
        order: Number.isFinite(screen.navigation.order)
          ? screen.navigation.order
          : index
      }))
      .sort((left, right) => left.order - right.order)
  );
}

export function findNavigationItem(items, screenId) {
  return (items || []).find((item) => item.id === screenId);
}
