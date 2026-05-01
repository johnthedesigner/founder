// import { v4 as uuidv4 } from "uuid";
// import { nanoid } from "nanoid";
import { nanoid } from "nanoid/non-secure";
import chroma from "chroma-js";
import _ from "lodash";

import * as Curves from "./curves";
import getColorName from "./getColorName";

const generateColors = async (
  sourceColor: string,
  steps: number = 16,
  customName: string,
  paletteId: string,
  preserveSourceColor: boolean = true,
  colorNamesInUse: string[] = []
): Promise<any> => {
  // Bail out if there isn't really a source color provided
  if (!sourceColor) return true;

  // Build gradient of contrast targets
  let lowContrast = 1.01;
  let highContrast = 19;
  let contrastRangeX = highContrast - lowContrast;
  let targetContrastArray = _.map(_.range(steps), (step) => {
    let output =
      Curves.easeInOutCustom((step + 1) / steps) * contrastRangeX + lowContrast;
    return output;
  });

  // Figure out the closest contrast value for source color and get the index
  let sourceContrast = chroma.contrast(sourceColor, "white");
  let closestContrastValue = _.first(
    _.sortBy(targetContrastArray, (contrastStep) => {
      return Math.abs(contrastStep - sourceContrast);
    })
  );

  // Return the index of the closest matching value
  let sourceColorIndex = _.findIndex(targetContrastArray, (o) => {
    return o === closestContrastValue;
  });

  // Confine a number to a range from 0 to 1
  let confine = (number: number) => {
    return Math.max(Math.min(number, 1), 0);
  };

  // Generate new colors close to target contrasts in array
  let colorOptionsArray = new Array();
  // let hueRate = 0.02; // rate of hue change
  let hueRate = 0.1; // rate of hue change
  // let satRate = 0.006; // rate of saturation change
  let satRate = 0.02; // rate of saturation change
  let lumRate = 0.01; // rate of luminosity change
  // First build an array of many colors to choose from
  _.times(steps * 20, (index) => {
    let sourceColorHSV = chroma(sourceColor).hsv();
    let lighterHue = sourceColorHSV[0] + hueRate * index;
    let lighterSat = confine(sourceColorHSV[1] - satRate * index);
    let lighterLum = confine(sourceColorHSV[2] + lumRate * index);
    let darkerHue = sourceColorHSV[0] - hueRate * 2 * index;
    let darkerSat = confine(sourceColorHSV[1] + satRate * 4 * index);
    let darkerLum = confine(sourceColorHSV[2] - lumRate * index);
    let lighterColor = chroma(
      chroma.hsv(lighterHue, lighterSat, lighterLum)
    ).hex();
    let darkerColor = chroma(chroma.hsv(darkerHue, darkerSat, darkerLum)).hex();
    colorOptionsArray.push(darkerColor);
    colorOptionsArray.push(lighterColor);
  });
  // Choose a final set of colors by which are closes to target contrast values from our array
  let contrastMatchedColors = _.map(
    targetContrastArray,
    (targetContrastValue) => {
      let selectedColor = _.first(
        _.sortBy(colorOptionsArray, (candidateColor) => {
          let contrastDifference = Math.abs(
            chroma.contrast(candidateColor, "white") - targetContrastValue
          );
          return contrastDifference;
        })
      );
      return selectedColor;
    }
  );

  // Assemble the swatch list for this palette
  // Use new gradient to make colors
  let swatchList = _.map(contrastMatchedColors, (color, index) => {
    // If this is the source color index, override the hex to the source color
    if (index === sourceColorIndex && preserveSourceColor) {
      color = sourceColor;
    }
    const contrastWhite = chroma.contrast(color, "white");
    const contrastBlack = chroma.contrast(color, "black");
    var displayColor = "";
    if (contrastWhite >= 4.5) {
      displayColor = "white";
    } else {
      displayColor = "black";
    }
    return {
      id: nanoid(),
      paletteId: paletteId,
      index,
      hex: chroma(color).hex(),
      hue: chroma(color).hsv()[0],
      sat: chroma(color).hsv()[1],
      lum: chroma(color).hsv()[2],
      hsv: chroma(color).hsv(),
      hsl: chroma(color).hsl(),
      rgb: chroma(color).rgb(),
      contrastBlack: contrastBlack,
      contrastWhite: contrastWhite,
      displayColor: displayColor,
      sourceColorIndex,
      steps,
      name: "",
    };
  });

  // Pick a name for this set of swatches and apply it to each swatch
  var swatchName = "";
  if (customName === "") {
    swatchName = getColorName(sourceColor, colorNamesInUse);
  } else {
    swatchName = customName;
  }

  // Make the swatch name lowercase and replace spaces with hyphens
  let swatchNameFormatted = swatchName.trim().replace(/\s/g, "-").toLowerCase();

  // Generate Tailwind-compatible scale values based on step count
  const getTailwindScale = (steps: number, index: number) => {
    if (steps === 11) {
      // Standard Tailwind scale: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
      const scale = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
      return scale[index] || index;
    } else if (steps === 18) {
      // Extended Tailwind scale with additional values
      const scale = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900];
      return scale[index] || index;
    } else {
      // Fallback to index for other step counts
      return index;
    }
  };

  // Add swatch names to each swatch in the palette
  _.each(swatchList, (swatch, i) => {
    const scaleValue = getTailwindScale(steps, i);
    swatchList[i].name = `${swatchNameFormatted}-${scaleValue}`;
  });

  return {
    // id: nanoid(), // Now generating this up front in main.ts
    name: swatchName,
    id: paletteId,
    swatches: swatchList,
    sourceColorIndex: swatchList[0].sourceColorIndex,
  };
};

export default generateColors;
