// Format Factor for Vector
export function formatFactor(key: string, value: string) {
  return key === 'CVSS' ? `${key}:${value}` : `/${key}:${value}`;
}

// Get Factor Values from Vector
export function getFactors(cvssVector: string){
  const factors: Record<string, string> = {};
  if (!cvssVector) {
    for (const key in factorPatterns) {
      factors[key] = '';
    }
  } else {
    for (const key in factorPatterns) {
      const regex = factorPatterns[key];
      const match = cvssVector.match(regex);
      factors[key] = match && match.groups ? 
        match.groups[key]
        : '';
    }
  }
  return factors;
}

// Calculates Base Score
export function calculateBaseScore(factors: Record<string, string>) {
  const unchangedScope = factors['S'] === 'U';

  // ISS
  const confidentiality = weights['C'][factors['C']];
  const integrity = weights['I'][factors['I']];
  const availability = weights['A'][factors['A']];
  
  const iss = 1 - ((1 - confidentiality) * (1 - integrity) * (1 - availability));

  // Impact
  const impact = unchangedScope ? 6.42 * iss : (7.52 * (iss - 0.029) - (3.25 * ((iss - 0.02)**15)));

  // Exploitability
  const attackVector = weights['AV'][factors['AV']];
  const attackComplexity = weights['AC'][factors['AC']];
  const privilegesRequired = unchangedScope ? weights['PRU'][factors['PR']] : weights['PRC'][factors['PR']];
  const userInteraction = weights['UI'][factors['UI']];

  const exploitability = 8.22 * attackVector * attackComplexity * privilegesRequired * userInteraction;

  // Base Score
  let baseScore = 0;

  if(impact > 0) {
    baseScore = unchangedScope ? Math.min((impact + exploitability), 10)
      : Math.min(1.08 * (impact + exploitability), 10);
    // Round up with one decimal precision
    baseScore = Math.round(Math.ceil(10 * baseScore)) / 10;
  }

  return baseScore;
}

// Calculates Temporal Score
export function calculateTemporalScore(baseScore: number, factors: Record<string, string>) {
  const exploitCodeMaturity = weights['E'][factors['E']];
  const remediationLevel = weights['RL'][factors['RL']];
  const reportConfidence = weights['RC'][factors['RC']];
  
  let temporalScore = baseScore * exploitCodeMaturity * remediationLevel * reportConfidence;

  // Round up with one decimal precision
  temporalScore = Math.round(Math.ceil(10 * temporalScore)) / 10;

  return temporalScore;
}

// Factors Weights
export const weights: { [factor: string]: { [value: string]: number } } = {
  AV: {
    N: 0.85,
    A: 0.62,
    L: 0.55,
    P: 0.2
  },
  AC: {
    L: 0.77,
    H: 0.44
  },
  PRU: {
    N: 0.85,
    L: 0.62,
    H: 0.27
  },
  PRC: {
    N: 0.85,
    L: 0.68,
    H: 0.5
  },
  UI: {
    N: 0.85,
    R: 0.62
  },
  C: {
    N: 0.0,
    L: 0.22,
    H: 0.56
  },
  I: {
    N: 0.0,
    L: 0.22,
    H: 0.56
  },
  A: {
    N: 0.0,
    L: 0.22,
    H: 0.56
  },
  E: {
    U: 0.91,
    P: 0.94,
    F: 0.97,
    H: 1.0,
    X: 1.0
  },
  RL: {
    U: 1.0,
    W: 0.97,
    T: 0.96,
    O: 0.95,
    X: 1.0
  },
  RC: {
    C: 1.0,
    R: 0.96,
    U: 0.92,
    X: 1.0
  }
};

// Factor RegExp Patterns
export const factorPatterns: { [key: string]: RegExp } = {
  CVSS: /CVSS:(?<CVSS>[^/]+)/,
  // base (required):
  AV: /AV:(?<AV>[NALP])/,
  AC: /AC:(?<AC>[LH])/,
  PR: /PR:(?<PR>[NLH])/,
  UI: /UI:(?<UI>[NR])/,
  S: /S:(?<S>[UC])/,
  C: /C:(?<C>[NLH])/,
  I: /I:(?<I>[NLH])/,
  A: /A:(?<A>[NLH])/,
  // temporal (optional):
  E: /E:(?<E>[XUPFH])/,
  RL: /RL:(?<RL>[XOTWU])/,
  RC: /RC:(?<RC>[XURC])/,
  // environmental (optional):
  CR: /CR:(?<CR>[XLMH])/,
  IR: /IR:(?<IR>[XLMH])/,
  AR: /AR:(?<AR>[XLMH])/,
  MAV: /MAV:(?<MAV>[XNALP])/,
  MAC: /MAC:(?<MAC>[XLH])/,
  MPR: /MPR:(?<MPR>[XNLH])/,
  MUI: /MUI:(?<MUI>[XNR])/,
  MS: /MS:(?<MS>[XUC])/,
  MC: /MC:(?<MC>[XNLH])/,
  MI: /MI:(?<MI>[XNLH])/,
  MA: /MA:(?<MA>[XNLH])/,
};

// Calculator Buttons Data
export const calculatorButtons = {
  blocks: [
    {
      name: 'Base Score',
      rows: [
        {
          cols: [
            {
              id: 'AV',
              label: 'Attack Vector',
              buttons: [
                { key: 'N', name: 'Network', value:'Network Attack Vector' },
                { key: 'A', name: 'Adjacent', value:'Adjacent Attack Vector' },
                { key: 'L', name: 'Local', value:'Local Attack Vector' },
                { key: 'P', name: 'Physical', value:'Physical Attack Vector' },
              ],
            },
            {
              id: 'AC',
              label: 'Attack Complexity',
              buttons: [
                { key: 'L', name: 'Low', value:'Low Attack Complexity' },
                { key: 'H', name: 'High', value:'High Attack Complexity' },
              ],
            },
            {
              id: 'PR',
              label: 'Privileges Required',
              buttons: [
                { key: 'N', name: 'None', value:'None Privileges Required' },
                { key: 'L', name: 'Low', value:'Low Privileges Required' },
                { key: 'H', name: 'High', value:'High Privileges Required' },
              ],
            },
            {
              id: 'UI',
              label: 'User Interaction',
              buttons: [
                { key: 'N', name: 'None', value:'User Interaction None' },
                { key: 'R', name: 'Requred', value:'User Interaction Required' },
              ],
            },
          ],
        },
        {
          cols: [
            {
              id: 'S',
              label: 'Scope',
              buttons: [
                { key: 'U', name: 'Unchanged', value:'Unchanged Scope' },
                { key: 'C', name: 'Changed', value:'Changed Scope' },
              ],
            },
            {
              id: 'C',
              label: 'Confidentiality',
              buttons: [
                { key: 'N', name: 'None', value:'None Confidentiality' },
                { key: 'L', name: 'Low', value:'Low Confidentiality' },
                { key: 'H', name: 'High', value:'High Confidentiality' },
              ],
            },
            {
              id: 'I',
              label: 'Integrity',
              buttons: [
                { key: 'N', name: 'None', value:'None Integrity' },
                { key: 'L', name: 'Low', value:'Low Integrity' },
                { key: 'H', name: 'High', value:'High Integrity' },
              ],
            },
            {
              id: 'A',
              label: 'Availability',
              buttons: [
                { key: 'N', name: 'None', value:'None Availability' },
                { key: 'L', name: 'Low', value:'Low Availability' },
                { key: 'H', name: 'High', value:'High Availability' },
              ],
            },
          ],
        }
      ]
    },
    {
      name: 'Temporal Score',
      rows: [
        {
          cols: [
            {
              id: 'E',
              label: 'Exploit Code Maturity',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Not Defined Exploit Code Maturity'
                },
                { key: 'U', name: 'Unproven', value:
                  'Unproven Exploit Code Maturity'
                },
                { key: 'P', name: 'Proof-of-Concept', value:
                  'Proof-of-Concept Exploit Code Maturity'
                },
                { key: 'F', name: 'Functional', value:
                  'Functional Exploit Code Maturity'
                },
                { key: 'H', name: 'High', value:
                  'High Exploit Code Maturity'
                },
              ],
            },
            {
              id: 'RL',
              label: 'Remediation Level',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Not Defined Remediation Level'
                },
                { key: 'O', name: 'Official Fix', value:
                  'Official Fix Remediation Level'
                },
                { key: 'T', name: 'Temporary Fix', value:
                  'Temporary Fix Required'
                },
                { key: 'W', name: 'Workaround', value:
                  'Workaround Remediation Level'
                },
                { key: 'U', name: 'Unavailable', value:
                  'Unavailable Remediation Level'
                },
              ],
            },
            {
              id: 'RC',
              label: 'Report Confidence',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Not Defined Report Confidence'
                },
                { key: 'U', name: 'Unknown', value:
                  'Unknown Report Confidence'
                },
                { key: 'R', name: 'Reasonable', value:
                  'Reasonable Report Confidence'
                },
                { key: 'C', name: 'Confirmed', value:
                  'Confirmed Report Confidence'
                },
              ],
            }
          ],
        }
      ]
    },
    {
      name: 'Environmental Score',
      rows: [
        {
          cols: [
            {
              id: 'CR',
              label: 'Confidentiality Requirement',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Not Defined Confidentiality Requirement'
                },
                { key: 'L', name: 'Low', value:
                  'Low Confidentiality Requirement'
                },
                { key: 'M', name: 'Medium', value:
                  'Medium Confidentiality Requirement'
                },
                { key: 'H', name: 'High', value:
                  'High Confidentiality Requirement'
                },
              ],
            },
            {
              id: 'IR',
              label: 'Integrity Requirement',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Not Defined Integrity Requirement'
                },
                { key: 'L', name: 'Low', value:
                  'Low Integrity Requirement'
                },
                { key: 'M', name: 'Medium', value:
                  'Medium Integrity Requirement'
                },
                { key: 'H', name: 'High', value:
                  'High Integrity Requirement'
                },
              ],
            },
            {
              id: 'AR',
              label: 'Availability Requirement',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Not Defined Availability Requirement'
                },
                { key: 'L', name: 'Low', value:
                  'Low Availability Requirement'
                },
                { key: 'M', name: 'Medium', value:
                  'Medium Availability Requirement'
                },
                { key: 'H', name: 'High', value:
                  'High Availability Requirement'
                },
              ],
            },
          ],
        },
        {
          cols: [
            {
              id: 'MAV',
              label: 'Modified Attack Vector',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Unchanged Modified Attack Vector'
                },
                { key: 'N', name: 'Network', value:
                  'Changed Modified Attack Vector'
                },
                { key: 'A', name: 'Adjacent Network', value:
                  'Changed Modified Attack Vector'
                },
                { key: 'L', name: 'Local', value:
                  'Changed Modified Attack Vector'
                },
                { key: 'P', name: 'Physical', value:
                  'Changed Modified Attack Vector'
                },
              ],
            },
            {
              id: 'MAC',
              label: 'Modified Attack Complexity',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Not Defined Modified Attack Complexity'
                },
                { key: 'L', name: 'Low', value:
                  'Low Modified Modified Attack Complexity'
                },
                { key: 'H', name: 'High', value:
                  'High Modified Modified Attack Complexity'
                },
              ],
            },
            {
              id: 'MPR',
              label: 'Modified Privileges Required',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Not Defined Modified Privileges Required'
                },
                { key: 'N', name: 'None', value:
                  'None Modified Privileges Required'
                },
                { key: 'L', name: 'Low', value:
                  'Low Modified Privileges Required'
                },
                { key: 'H', name: 'High', value:
                  'High Modified Privileges Required'
                },
              ],
            },
            {
              id: 'MUI',
              label: 'Modified User Interaction',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Not Defined Modified User Interaction'
                },
                { key: 'N', name: 'None', value:
                  'None Modified Modified User Interaction'
                },
                { key: 'R', name: 'Required', value:
                  'Required Modified Modified User Interaction'
                },
              ],
            },
          ],
        },
        {
          cols: [
            {
              id: 'MS',
              label: 'Modified Scope',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Not Defined Modified Scope'
                },
                { key: 'U', name: 'Unchanged', value:
                  'Unchanged Modified Scope'
                },
                { key: 'C', name: 'Changed', value:
                  'Changed Modified Scope'
                },
              ],
            },
            {
              id: 'MC',
              label: 'Modified Confidentiality',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Not Defined Modified Confidentiality'
                },
                { key: 'N', name: 'None', value:
                  'None Modified Confidentiality'
                },
                { key: 'L', name: 'Low', value:
                  'Low Modified Modified Confidentiality'
                },
                { key: 'H', name: 'High', value:
                  'High Modified Modified Confidentiality'
                },
              ],
            },
            {
              id: 'MI',
              label: 'Modified Integrity',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Not Defined Modified Integrity'
                },
                { key: 'N', name: 'None', value:
                  'None Modified Integrity'
                },
                { key: 'L', name: 'Low', value:
                  'Low Modified Modified Integrity'
                },
                { key: 'H', name: 'High', value:
                  'High Modified Modified Integrity'
                },
              ],
            },
            {
              id: 'MA',
              label: 'Modified Availability',
              buttons: [
                { key: 'X', name: 'Not Defined', value:
                  'Not Defined Modified Availability'
                },
                { key: 'N', name: 'None', value:
                  'None Modified Availability'
                },
                { key: 'L', name: 'Low', value:
                  'Low Modified Modified Availability'
                },
                { key: 'H', name: 'High', value:
                  'High Modified Modified Availability'
                },
              ],
            },
          ],
        }
      ]
    },
  ],
};
