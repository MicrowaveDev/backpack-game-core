import { artifactPreviewOrientation } from '../../client/view-model.js';
import {
  ArtifactCatalogBrowser,
  ArtifactGridBoard,
  ArtifactStatSummary
} from '../components.js';

const MIN_COLUMNS = 6;
const MAX_COLUMNS = 18;

function localizedField(artifact, field, locale) {
  const value = artifact?.[field];
  if (value && typeof value === 'object') {
    return value[locale] || value.en || value.ru || (field === 'name' ? artifact?.id : '') || '';
  }
  return value || (field === 'name' ? artifact?.id : '') || '';
}

function defaultArtifactsFor(controller) {
  return controller?.artifacts || [];
}

function defaultRecipesFor(controller) {
  return controller?.state?.bootstrap?.recipes || [];
}

function defaultLocaleFor(controller) {
  return controller?.state?.locale || 'en';
}

function defaultLabelsFor(controller) {
  return controller?.text || {};
}

function defaultImageForArtifact(artifact) {
  return artifact?.image || artifact?.imagePath || '';
}

function defaultFamilyForArtifact(artifact) {
  return artifact?.family || '';
}

function defaultFamilyLabelFor(artifact, labels, familyForArtifact) {
  const family = familyForArtifact(artifact);
  const suffix = String(family).replace(/^./, (value) => value.toUpperCase());
  return labels[`artifactFamily${suffix}`] || family;
}

function defaultGroupDefinitions(labels, familyForArtifact) {
  return [
    ['fusion', labels.artifactGroupFusion, (_artifact, isFusion) => isFusion],
    ['damage', labels.artifactFamilyDamage, (artifact, isFusion) => (
      familyForArtifact(artifact) === 'damage' && !isFusion
    )],
    ['armor', labels.artifactFamilyArmor, (artifact, isFusion) => (
      familyForArtifact(artifact) === 'armor' && !isFusion
    )],
    ['stun', labels.artifactFamilyStun, (artifact, isFusion) => (
      familyForArtifact(artifact) === 'stun' && !isFusion
    )],
    ['bag', labels.artifactFamilyBag, (artifact) => familyForArtifact(artifact) === 'bag']
  ];
}

function normalizeRecipe(recipe, artifactMap) {
  const ingredientIds = recipe?.ingredientArtifactIds || [];
  const ingredients = ingredientIds.map((id) => artifactMap.get(id)).filter(Boolean);
  return {
    ...recipe,
    ingredients,
    result: artifactMap.get(recipe?.resultArtifactId)
  };
}

export function placeConfiguredArtifactGroup(id, label, artifacts, columns, orientationForArtifact) {
  const occupied = new Set();
  const items = [];
  let rows = 1;
  const free = (x, y, width, height) => {
    if (x + width > columns) return false;
    for (let cy = y; cy < y + height; cy += 1) {
      for (let cx = x; cx < x + width; cx += 1) {
        if (occupied.has(`${cx}:${cy}`)) return false;
      }
    }
    return true;
  };

  for (const artifact of artifacts) {
    const orientation = orientationForArtifact(artifact);
    const width = Math.min(columns, Math.max(1, orientation.width));
    const height = Math.max(1, orientation.height);
    let placed = false;
    for (let y = 0; !placed; y += 1) {
      for (let x = 0; x <= columns - width; x += 1) {
        if (!free(x, y, width, height)) continue;
        for (let cy = y; cy < y + height; cy += 1) {
          for (let cx = x; cx < x + width; cx += 1) occupied.add(`${cx}:${cy}`);
        }
        items.push({
          id: artifact.id,
          rowId: artifact.id,
          artifactId: artifact.id,
          x,
          y,
          width,
          height
        });
        rows = Math.max(rows, y + height);
        placed = true;
        break;
      }
    }
  }
  return { id, label, artifacts, columns, rows, items };
}

export function createConfiguredArtifactCatalogBrowser({
  name = 'ConfiguredArtifactCatalogBrowser',
  artifactFigureComponent,
  artifactsFor = defaultArtifactsFor,
  recipesFor = defaultRecipesFor,
  localeFor = defaultLocaleFor,
  labelsFor = defaultLabelsFor,
  imageForArtifact = defaultImageForArtifact,
  familyForArtifact = defaultFamilyForArtifact,
  familyLabelFor = defaultFamilyLabelFor,
  groupDefinitions = defaultGroupDefinitions,
  orientationForArtifact = artifactPreviewOrientation,
  normalizeRecipeForCatalog = normalizeRecipe,
  displayNameForArtifact = (artifact, locale) => localizedField(artifact, 'name', locale),
  descriptionForArtifact = (artifact, locale) => localizedField(artifact, 'description', locale),
  minColumns = MIN_COLUMNS,
  maxColumns = MAX_COLUMNS
} = {}) {
  if (!artifactFigureComponent) {
    throw new TypeError('artifactFigureComponent is required');
  }

  return {
    name,
    components: {
      ArtifactCatalogBrowser,
      ArtifactGridBoard,
      ArtifactStatSummary,
      ConfiguredArtifactFigure: artifactFigureComponent
    },
    props: {
      controller: { type: Object, required: true }
    },
    data() {
      return {
        selectedArtifactId: '',
        columns: minColumns
      };
    },
    computed: {
      locale() {
        return localeFor(this.controller);
      },
      text() {
        return labelsFor(this.controller, this.locale);
      },
      artifactFigureComponent() {
        return artifactFigureComponent;
      },
      artifacts() {
        return [...artifactsFor(this.controller)]
          .sort((left, right) => (
            displayNameForArtifact(left, this.locale)
              .localeCompare(displayNameForArtifact(right, this.locale))
          ));
      },
      artifactMap() {
        return new Map(this.artifacts.map((artifact) => [artifact.id, artifact]));
      },
      recipes() {
        return recipesFor(this.controller)
          .map((recipe) => normalizeRecipeForCatalog(recipe, this.artifactMap))
          .filter((recipe) => (
            recipe.result
            && recipe.ingredients.length === (recipe.ingredientArtifactIds || []).length
          ));
      },
      recipeMap() {
        return new Map(this.recipes.map((recipe) => [recipe.resultArtifactId, recipe]));
      },
      selectedArtifact() {
        return this.artifactMap.get(this.selectedArtifactId) || null;
      },
      selectedRecipe() {
        return this.recipeMap.get(this.selectedArtifactId) || null;
      },
      selectedItem() {
        const artifact = this.selectedArtifact;
        if (!artifact) return null;
        const orientation = orientationForArtifact(artifact);
        return {
          id: artifact.id,
          title: displayNameForArtifact(artifact, this.locale),
          description: descriptionForArtifact(artifact, this.locale),
          kicker: this.selectedRecipe ? this.text.recipeFusionOnly : this.familyLabel(artifact),
          orientation,
          previewItem: [{
            artifactId: artifact.id,
            x: 0,
            y: 0,
            width: orientation.width,
            height: orientation.height
          }],
          facts: [
            {
              key: 'footprint',
              label: this.text.artifactCatalogFootprint,
              value: `${orientation.width}x${orientation.height}`
            },
            {
              key: 'price',
              label: this.text.artifactCatalogPrice,
              value: artifact.price ?? 1
            },
            {
              key: 'family',
              label: this.text.artifactCatalogFamily,
              value: this.familyLabel(artifact)
            },
            {
              key: 'slots',
              label: this.text.artifactCatalogSlots,
              value: artifact.slotCount || 0,
              visible: familyForArtifact(artifact) === 'bag'
            }
          ]
        };
      },
      groups() {
        return groupDefinitions(this.text, familyForArtifact)
          .map(([id, label, match]) => placeConfiguredArtifactGroup(
            id,
            label,
            this.artifacts.filter((artifact) => match(artifact, this.recipeMap.has(artifact.id))),
            this.columns,
            orientationForArtifact
          ))
          .filter((group) => group.artifacts.length);
      },
      labels() {
        return {
          all: this.text.artifactCatalogAll,
          gridTitle: this.text.artifactCatalogGridTitle,
          closeDetails: this.text.artifactCatalogCloseDetails,
          ingredients: this.text.recipeIngredients
        };
      },
      selectedIds() {
        return this.selectedArtifactId ? new Set([this.selectedArtifactId]) : new Set();
      },
      statLabels() {
        return {
          damage: this.text.statDamage,
          armor: this.text.statArmor,
          speed: this.text.statSpeed,
          stunChance: this.text.statStun
        };
      }
    },
    methods: {
      getArtifact(id) {
        return this.artifactMap.get(id);
      },
      imageFor(artifact) {
        return imageForArtifact(artifact);
      },
      familyLabel(artifact) {
        return familyLabelFor(artifact, this.text, familyForArtifact);
      },
      resize({ panelWidth = 0, viewportWidth = panelWidth } = {}) {
        const compact = viewportWidth <= 560 || panelWidth <= 520;
        const cellSize = compact ? 42 : 50;
        const gap = compact ? 5 : 7;
        const padding = compact ? 32 : 44;
        const available = Math.max(minColumns * cellSize, panelWidth - padding);
        this.columns = Math.min(
          compact ? 7 : maxColumns,
          Math.max(minColumns, Math.floor((available + gap) / (cellSize + gap)))
        );
      }
    },
    template: `
      <ArtifactCatalogBrowser
        :groups="groups"
        :count="artifacts.length"
        :selected-item="selectedItem"
        :selected-recipe="selectedRecipe"
        :labels="labels"
        :selected-row-ids="selectedIds"
        :highlighted-title="selectedItem?.title || ''"
        @select-item="selectedArtifactId = $event.artifactId"
        @close-details="selectedArtifactId = ''"
        @grid-panel-resize="resize"
      >
        <template #group-board="{ group, selectedRowIds, highlightedTitle, selectItem }">
          <ArtifactGridBoard
            class="artifact-catalog-group-board"
            variant="catalog"
            :columns="group.columns"
            :rows="group.rows"
            :items="group.items"
            :get-artifact="getArtifact"
            :artifact-figure-component="artifactFigureComponent"
            :artifact-image-for="imageFor"
            :clickable-pieces="true"
            :highlighted-row-ids="selectedRowIds"
            :highlighted-title="highlightedTitle"
            @piece-click="selectItem($event.artifactId, $event)"
          />
        </template>
        <template #detail-visual="{ item }">
          <ArtifactGridBoard
            variant="catalog"
            :columns="item.orientation.width"
            :rows="item.orientation.height"
            :items="item.previewItem"
            :get-artifact="getArtifact"
            :artifact-figure-component="artifactFigureComponent"
            :artifact-image-for="imageFor"
          />
        </template>
        <template #detail-stats="{ className }">
          <ArtifactStatSummary
            :class="className"
            :artifact="selectedArtifact"
            :labels="statLabels"
          />
        </template>
        <template #recipe-artifact="{ artifact }">
          <ConfiguredArtifactFigure
            :artifact="artifact"
            :display-width="1"
            :display-height="1"
          />
        </template>
      </ArtifactCatalogBrowser>
    `
  };
}
