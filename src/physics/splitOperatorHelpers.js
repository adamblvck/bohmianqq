/**
  * --------------------------------------
  * 3) Split-Operator Steps
  * --------------------------------------
  */
export const applyPotentialHalfStep = (psiRe, psiIm, V, dtOver2hbar) => {
	for (let i = 0; i < psiRe.length; i++) {
	  const phase = -V[i] * dtOver2hbar;
	  const c = Math.cos(phase);
	  const s = Math.sin(phase);
	  const reOld = psiRe[i];
	  const imOld = psiIm[i];
	  psiRe[i] = reOld * c - imOld * s;
	  psiIm[i] = reOld * s + imOld * c;
	}
  };
 
 export const applyKineticFullStep = (psiRe, psiIm, kineticRe, kineticIm) => {
	for (let i = 0; i < psiRe.length; i++) {
	  const reOld = psiRe[i];
	  const imOld = psiIm[i];
	  const kr = kineticRe[i];
	  const ki = kineticIm[i];
	  psiRe[i] = reOld * kr - imOld * ki;
	  psiIm[i] = reOld * ki + imOld * kr;
	}
  };
 
// Apply an absorbing (damping) mask near the edges (with margin = 0.1*(xMax-xMin))
// returns the total probability loss for this step
export const applyAbsorbingMask = (psiRe, psiIm, zArr, { xMin, xMax }) => {
	const margin = 0.25 * (xMax - xMin);
	let stepLossLeft = 0;  // loss for x < 0
	let stepLossRight = 0; // loss for x ≥ 0
	
	for (let i = 0; i < psiRe.length; i++) {
	  let factor = 1;
	  if (zArr[i] < xMin - margin) {
		factor = Math.exp(-Math.pow((xMin - margin - zArr[i]) / (margin/2), 2));
	  } else if (zArr[i] > xMax + margin) {
		factor = Math.exp(-Math.pow((zArr[i] - (xMax + margin)) / (margin/2), 2));
	  }
	  
	  const origProb = psiRe[i] * psiRe[i] + psiIm[i] * psiIm[i];
	  const newProb = factor * factor * origProb;
	  const localLoss = origProb - newProb;
	  
	  // Track losses separately based on position
	  if (zArr[i] < 0) {
		stepLossLeft += localLoss;
	  } else {
		stepLossRight += localLoss;
	  }
	  
	  psiRe[i] *= factor;
	  psiIm[i] *= factor;
	}
	
	return { stepLossLeft, stepLossRight };
};

export const applyCosineMask = (psiRe, psiIm, xArr, { xMin, xMax }) => {
	const domainWidth = xMax - xMin;
	const taperWidth = 0.25 * domainWidth; // 5% taper on each side
	const leftStart = xMin;
	const leftEnd = xMin + taperWidth;
	const rightStart = xMax - taperWidth;
	const rightEnd = xMax;
	let lossLeft = 0;
	let lossRight = 0;
  
	for (let i = 0; i < psiRe.length; i++) {
	  let factor = 1;
	  // Left taper: only apply mask for x in [leftStart, leftEnd]
	  if (xArr[i] >= leftStart && xArr[i] < leftEnd) {
		const theta = Math.PI * (xArr[i] - leftStart) / taperWidth;
		factor = 0.5 * (1 + Math.cos(theta));
	  }
	  // Right taper: only apply mask for x in [rightStart, rightEnd]
	  else if (xArr[i] > rightStart && xArr[i] <= rightEnd) {
		const theta = Math.PI * (xArr[i] - rightStart) / taperWidth;
		factor = 0.5 * (1 + Math.cos(theta));
	  }
	  // Elsewhere, factor remains 1
  
	  // Calculate loss if needed
	  const origProb = psiRe[i] * psiRe[i] + psiIm[i] * psiIm[i];
	  const newProb = factor * factor * origProb;
	  const localLoss = origProb - newProb;
	  if (xArr[i] < (xMin + domainWidth / 2))
		lossLeft += localLoss;
	  else
		lossRight += localLoss;
  
	  psiRe[i] *= factor;
	  psiIm[i] *= factor;
	}
  
	return { lossLeft, lossRight };
};

export const applyCAP = (psiRe, psiIm, zArr, { xMin, xMax, dt, hbar, W0 = 1.0 }) => {
	// Define a margin where the CAP will smoothly turn on (25% of the physical region)
	const margin = 0.25 * (xMax - xMin);
	let capLossLeft = 0;
	let capLossRight = 0;
  
	// Loop over all grid points
	for (let i = 0; i < psiRe.length; i++) {
	  let W = 0; // default: no absorption in the central region
	  // If we are to the left of the absorbing region, define a quadratic absorption profile
	  if (zArr[i] < xMin - margin) {
		const d = (xMin - margin) - zArr[i];
		W = W0 * Math.pow(d / (margin / 2), 2);
	  }
	  // Similarly for points to the right of the absorbing region
	  else if (zArr[i] > xMax + margin) {
		const d = zArr[i] - (xMax + margin);
		W = W0 * Math.pow(d / (margin / 2), 2);
	  }
	  // Calculate the CAP evolution factor exp(-W dt/ħ)
	  const factor = Math.exp(-W * dt / hbar);
  
	  // For bookkeeping, compute the local probability loss
	  const origProb = psiRe[i] * psiRe[i] + psiIm[i] * psiIm[i];
	  const newProb = factor * factor * origProb;
	  const localLoss = origProb - newProb;
  
	  if (zArr[i] < 0) {
		capLossLeft += localLoss;
	  } else {
		capLossRight += localLoss;
	  }
  
	  // Apply the CAP factor to both real and imaginary parts
	  psiRe[i] *= factor;
	  psiIm[i] *= factor;
	}
  
	return { capLossLeft, capLossRight };
};


  