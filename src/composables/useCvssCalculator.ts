import { z } from 'zod';

export const cvssVectorSchema = z.union([
  z.string().length(44, { message: 'Incomplete Cvss Vector. There are factors missing.' }),
  z.string().length(0).nullable()]);

export function validateCvssVector(cvssVector: string | undefined | null) {
  const parseResult = cvssVectorSchema.safeParse(cvssVector);
  if (parseResult.success === false) {
    return parseResult.error.errors[0].message;
  }
  return null;
}

// Format factor for vector display
export function formatFactor(key: string, value: string) {
  return key === 'CVSS' ? `${key}:${value}` : `/${key}:${value}`;
}

// Get vector string from factors
export function formatFactors(factors: Record<string, string>) {
  let vector = '';
  for (const key in factors) {
    if (factors[key]) {
      vector += formatFactor(key, factors[key]);
    }
  }
  return vector;
}

// Get factor values from vector
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
      factors[key] = match && match.groups
        ? match.groups[key]
        : '';
    }
  }
  return factors;
}

// Calculates score
export function calculateScore(factors: Record<string, string>) {
  const score = calculateBaseScore(factors);
  return isNaN(score) || Object.values(factors).includes('') ? null : score;
}

// Calculates base score
function calculateBaseScore(factors: Record<string, string>) {
  const unchangedScope = factors['S'] === 'U';

  // ISS
  const confidentiality = weights['C'][factors['C']];
  const integrity = weights['I'][factors['I']];
  const availability = weights['A'][factors['A']];

  const iss = 1 - ((1 - confidentiality) * (1 - integrity) * (1 - availability));

  // Impact
  const impact = unchangedScope ? 6.42 * iss : (7.52 * (iss - 0.029) - (3.25 * ((iss - 0.02) ** 15)));

  // Exploitability
  const attackVector = weights['AV'][factors['AV']];
  const attackComplexity = weights['AC'][factors['AC']];
  const privilegesRequired = unchangedScope ? weights['PRU'][factors['PR']] : weights['PRC'][factors['PR']];
  const userInteraction = weights['UI'][factors['UI']];

  const exploitability = 8.22 * attackVector * attackComplexity * privilegesRequired * userInteraction;

  // Base score
  let baseScore = 0;

  if (impact > 0) {
    baseScore = unchangedScope
      ? Math.min((impact + exploitability), 10)
      : Math.min(1.08 * (impact + exploitability), 10);
    // Round up with one decimal precision
    baseScore = Math.round(Math.ceil(10 * baseScore)) / 10;
  }

  return baseScore;
}

// Factors Weights
export const weights: { [factor: string]: { [value: string]: number } } = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  PRU: { N: 0.85, L: 0.62, H: 0.27 },
  PRC: { N: 0.85, L: 0.68, H: 0.5 },
  UI: { N: 0.85, R: 0.62 },
  C: { N: 0.0, L: 0.22, H: 0.56 },
  I: { N: 0.0, L: 0.22, H: 0.56 },
  A: { N: 0.0, L: 0.22, H: 0.56 },
  S: { U: .5, C: 1 },
  PR: { N: 0.85, L: 0.62, H: 0.33 },

};

export const factorSeverities: { [factor: string]: { [value: string]: string } } = {
  AV: { N: 'Worst', A: 'Worse', L: 'Bad', P: 'Bad' },
  AC: { L: 'Worst', H: 'Bad' },
  PR: { N: 'Worst', L: 'Worse', H: 'Bad' },
  UI: { N: 'Worst', R: 'Bad' },
  S: { U: 'Bad', C: 'Worst' },
  C: { H: 'Worst', L: 'Bad', N: 'Good' },
  I: { H: 'Worst', L: 'Bad', N: 'Good' },
  A: { H: 'Worst', L: 'Bad', N: 'Good' },
};


// Factor regex patterns
const factorPatterns: { [id: string]: RegExp } = {
  CVSS: /(?<=^|\/)CVSS:(?<CVSS>[^/]+)/,
  AV: /(?<=^|\/)AV:(?<AV>[NALP])/,
  AC: /(?<=^|\/)AC:(?<AC>[LH])/,
  PR: /(?<=^|\/)PR:(?<PR>[NLH])/,
  UI: /(?<=^|\/)UI:(?<UI>[NR])/,
  S: /(?<=^|\/)S:(?<S>[UC])/,
  C: /(?<=^|\/)C:(?<C>[NLH])/,
  I: /(?<=^|\/)I:(?<I>[NLH])/,
  A: /(?<=^|\/)A:(?<A>[NLH])/
};

/* eslint-disable max-len */
// Calculator Buttons Data
export const calculatorButtons = {
  name: 'Base Score',
  rows: [
    {
      cols: [
        {
          id: 'AV',
          label: 'Attack Vector',
          buttons: [
            {
              key: 'N',
              name: 'Network',
              value:'Network Attack Vector',
              info: 'The vulnerable component is bound to the network stack and the set of possible attackers extends beyond the other options listed below, up to and including the entire Internet. Such a vulnerability is often termed “remotely exploitable” and can be thought of as an attack being exploitable at the protocol level one or more network hops away (e.g., across one or more routers).'
            },
            {
              key: 'A',
              name: 'Adjacent',
              value:'Adjacent Attack Vector',
              info: 'The vulnerable component is bound to the network stack, but the attack is limited at the protocol level to a logically adjacent topology. This can mean an attack must be launched from the same shared physical (e.g., Bluetooth or IEEE 802.11) or logical (e.g., local IP subnet) network, or from within a secure or otherwise limited administrative domain (e.g., MPLS, secure VPN to an administrative network zone). One example of an Adjacent attack would be an ARP (IPv4) or neighbor discovery (IPv6) flood leading to a denial of service on the local LAN segment.'
            },
            {
              key: 'L',
              name: 'Local',
              value:'Local Attack Vector',
              info: 'The vulnerable component is not bound to the network stack and the attacker’s path is via read/write/execute capabilities. Either: 1.the attacker exploits the vulnerability by accessing the target system locally (e.g., keyboard, console), or remotely (e.g., SSH); 2.or the attacker relies on User Interaction by another person to perform actions required to exploit the vulnerability (e.g., using social engineering techniques to trick a legitimate user into opening a malicious document).'
            },
            {
              key: 'P',
              name: 'Physical',
              value:'Physical Attack Vector',
              info: 'The attack requires the attacker to physically touch or manipulate the vulnerable component. Physical interaction may be brief (e.g., evil maid attack) or persistent. An example of such an attack is a cold boot attack in which an attacker gains access to disk encryption keys after physically accessing the target system. Other examples include peripheral attacks via FireWire/USB Direct Memory Access (DMA).'
            },
          ],
        },
        {
          id: 'AC',
          label: 'Attack Complexity',
          buttons: [
            {
              key: 'L',
              name: 'Low',
              value:'Low Attack Complexity',
              info: 'Specialized access conditions or extenuating circumstances do not exist. An attacker can expect repeatable success when attacking the vulnerable component.'
            },
            {
              key: 'H',
              name: 'High',
              value:'High Attack Complexity',
              info: 'A successful attack depends on conditions beyond the attacker\'s control. That is, a successful attack cannot be accomplished at will, but requires the attacker to invest in some measurable amount of effort in preparation or execution against the vulnerable component before a successful attack can be expected.'
            },
          ],
        },
        {
          id: 'PR',
          label: 'Privileges Required',
          buttons: [
            {
              key: 'N',
              name: 'None',
              value:'None Privileges Required',
              info: 'The attacker is unauthorized prior to attack, and therefore does not require any access to settings or files of the the vulnerable system to carry out an attack.'
            },
            {
              key: 'L',
              name: 'Low',
              value:'Low Privileges Required',
              info: 'The attacker requires privileges that provide basic user capabilities that could normally affect only settings and files owned by a user. Alternatively, an attacker with Low privileges has the ability to access only non-sensitive resources.'
            },
            {
              key: 'H',
              name: 'High',
              value:'High Privileges Required',
              info: 'The attacker requires privileges that provide significant (e.g., administrative) control over the vulnerable component allowing access to component-wide settings and files.'
            },
          ],
        },
        {
          id: 'UI',
          label: 'User Interaction',
          buttons: [
            {
              key: 'N',
              name: 'None',
              value:'User Interaction None',
              info: 'The vulnerable system can be exploited without interaction from any user.'
            },
            {
              key: 'R',
              name: 'Required',
              value:'User Interaction Required',
              info: 'Successful exploitation of this vulnerability requires a user to take some action before the vulnerability can be exploited. For example, a successful exploit may only be possible during the installation of an application by a system administrator.'
            },
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
            {
              key: 'C',
              name: 'Changed',
              value:'Changed Scope',
              info: 'An exploited vulnerability can affect resources beyond the security scope managed by the security authority of the vulnerable component. In this case, the vulnerable component and the impacted component are different and managed by different security authorities.'
            },
            {
              key: 'U',
              name: 'Unchanged',
              value:'Unchanged Scope',
              info: 'An exploited vulnerability can only affect resources managed by the same security authority. In this case, the vulnerable component and the impacted component are either the same, or both are managed by the same security authority.'
            },
          ],
        },
        {
          id: 'C',
          label: 'Confidentiality',
          buttons: [
            {
              key: 'H',
              name: 'High',
              value:'High Confidentiality',
              info: 'There is a total loss of confidentiality, resulting in all resources within the impacted component being divulged to the attacker. Alternatively, access to only some restricted information is obtained, but the disclosed information presents a direct, serious impact. For example, an attacker steals the administrator\'s password, or private encryption keys of a web server.'
            },
            {
              key: 'L',
              name: 'Low',
              value:'Low Confidentiality',
              info: 'There is some loss of confidentiality. Access to some restricted information is obtained, but the attacker does not have control over what information is obtained, or the amount or kind of loss is limited. The information disclosure does not cause a direct, serious loss to the impacted component.'
            },
            {
              key: 'N',
              name: 'None',
              value:'None Confidentiality',
              info: 'There is no loss of confidentiality within the impacted component.'
            },
          ],
        },
        {
          id: 'I',
          label: 'Integrity',
          buttons: [
            {
              key: 'H',
              name: 'High',
              value:'High Integrity',
              info: 'There is a total loss of integrity, or a complete loss of protection. For example, the attacker is able to modify any/all files protected by the impacted component. Alternatively, only some files can be modified, but malicious modification would present a direct, serious consequence to the impacted component.'
            },
            {
              key: 'L',
              name: 'Low',
              value:'Low Integrity',
              info: 'Modification of data is possible, but the attacker does not have control over the consequence of a modification, or the amount of modification is limited. The data modification does not have a direct, serious impact on the impacted component.'
            },
            {
              key: 'N',
              name: 'None',
              value:'None Integrity',
              info: 'There is no loss of integrity within the impacted component.'
            },
          ],
        },
        {
          id: 'A',
          label: 'Availability',
          buttons: [
            {
              key: 'H',
              name: 'High',
              value:'High Availability',
              info: 'There is a total loss of availability, resulting in the attacker being able to fully deny access to resources in the impacted component; this loss is either sustained (while the attacker continues to deliver the attack) or persistent (the condition persists even after the attack has completed). Alternatively, the attacker has the ability to deny some availability, but the loss of availability presents a direct, serious consequence to the impacted component (e.g., the attacker cannot disrupt existing connections, but can prevent new connections; the attacker can repeatedly exploit a vulnerability that, in each instance of a successful attack, leaks a only small amount of memory, but after repeated exploitation causes a service to become completely unavailable).'
            },
            {
              key: 'L',
              name: 'Low',
              value:'Low Availability',
              info: 'Performance is reduced or there are interruptions in resource availability. Even if repeated exploitation of the vulnerability is possible, the attacker does not have the ability to completely deny service to legitimate users. The resources in the impacted component are either partially available all of the time, or fully available only some of the time, but overall there is no direct, serious consequence to the impacted component.'
            },
            {
              key: 'N',
              name: 'None',
              value:'None Availability',
              info: 'There is no impact to availability within the impacted component.'
            },
          ],
        },
      ],
    }
  ]
};
