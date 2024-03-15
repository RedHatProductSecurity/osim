
export const calculatorButtons = {
  blocks: [
    {
      name: 'Base Score',
      rows: [
        {
          cols: [
            {
              label: 'Attack Vector',
              buttons: [
                { name: 'Network', action: () => { console.log('Network Attack Vector'); } },
                { name: 'Adjacent', action: () => { console.log('Adjacent Attack Vector'); } },
                { name: 'Local', action: () => { console.log('Local Attack Vector'); } },
                { name: 'Physical', action: () => { console.log('Physical Attack Vector'); } },
              ],
            },
            {
              label: 'Attack Complexity',
              buttons: [
                { name: 'High', action: () => { console.log('High Attack Complexity'); } },
                { name: 'Low', action: () => { console.log('Low Attack Complexity'); } },
              ],
            },
            {
              label: 'Privileges Required',
              buttons: [
                { name: 'None', action: () => { console.log('None Privileges Required'); } },
                { name: 'Low', action: () => { console.log('Low Privileges Required'); } },
                { name: 'High', action: () => { console.log('High Privileges Required'); } },
              ],
            },
            {
              label: 'User Interaction',
              buttons: [
                { name: 'None', action: () => { console.log('User Interaction None'); } },
                { name: 'Requred', action: () => { console.log('User Interaction Required'); } },
              ],
            },
          ],
        },
        {
          cols: [
            {
              label: 'Scope',
              buttons: [
                { name: 'Unchanged', action: () => { console.log('Unchanged Scope'); } },
                { name: 'Changed', action: () => { console.log('Changed Scope'); } },
              ],
            },
            {
              label: 'Confidentiality',
              buttons: [
                { name: 'None', action: () => { console.log('None Confidentiality'); } },
                { name: 'Low', action: () => { console.log('Low Confidentiality'); } },
                { name: 'High', action: () => { console.log('High Confidentiality'); } },
              ],
            },
            {
              label: 'Integrity',
              buttons: [
                { name: 'None', action: () => { console.log('None Integrity'); } },
                { name: 'Low', action: () => { console.log('Low Integrity'); } },
                { name: 'High', action: () => { console.log('High Integrity'); } },
              ],
            },
            {
              label: 'Availability',
              buttons: [
                { name: 'None', action: () => { console.log('None Availability'); } },
                { name: 'Low', action: () => { console.log('Low Availability'); } },
                { name: 'High', action: () => { console.log('High Availability'); } },
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
              label: 'Exploit Code Maturity',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Not Defined Exploit Code Maturity'); 
                } },
                { name: 'Unproven', action: () => { 
                  console.log('Unproven Exploit Code Maturity'); 
                } },
                { name: 'Proof-of-Concept', action: () => { 
                  console.log('Proof-of-Concept Exploit Code Maturity'); 
                } },
                { name: 'Functional', action: () => { 
                  console.log('Functional Exploit Code Maturity'); 
                } },
                { name: 'High', action: () => { 
                  console.log('High Exploit Code Maturity'); 
                } },
              ],
            },
            {
              label: 'Remediation Level',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Not Defined Remediation Level'); 
                } },
                { name: 'Official Fix', action: () => { 
                  console.log('Official Fix Remediation Level'); 
                } },
                { name: 'Temporary Fix', action: () => { 
                  console.log('Temporary Fix Required'); 
                } },
                { name: 'Workaround', action: () => { 
                  console.log('Workaround Remediation Level'); 
                } },
                { name: 'Unavailable', action: () => { 
                  console.log('Unavailable Remediation Level'); 
                } },
              ],
            },
            {
              label: 'Report Confidence',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Not Defined Report Confidence'); 
                } },
                { name: 'Unknown', action: () => { 
                  console.log('Unknown Report Confidence'); 
                } },
                { name: 'Reasonable', action: () => { 
                  console.log('Reasonable Report Confidence'); 
                } },
                { name: 'Confirmed', action: () => { 
                  console.log('Confirmed Report Confidence'); 
                } },
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
              label: 'Confidentiality Requirement',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Not Defined Confidentiality Requirement'); 
                } },
                { name: 'Low', action: () => { 
                  console.log('Low Confidentiality Requirement'); 
                } },
                { name: 'Medium', action: () => { 
                  console.log('Medium Confidentiality Requirement'); 
                } },
                { name: 'High', action: () => { 
                  console.log('High Confidentiality Requirement'); 
                } },
              ],
            },
            {
              label: 'Integrity Requirement',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Not Defined Integrity Requirement'); 
                } },
                { name: 'Low', action: () => { 
                  console.log('Low Integrity Requirement'); 
                } },
                { name: 'Medium', action: () => { 
                  console.log('Medium Integrity Requirement'); 
                } },
                { name: 'High', action: () => { 
                  console.log('High Integrity Requirement'); 
                } },
              ],
            },
            {
              label: 'Availability Requirement',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Not Defined Availability Requirement'); 
                } },
                { name: 'Low', action: () => { 
                  console.log('Low Availability Requirement'); 
                } },
                { name: 'Medium', action: () => { 
                  console.log('Medium Availability Requirement'); 
                } },
                { name: 'High', action: () => { 
                  console.log('High Availability Requirement'); 
                } },
              ],
            },
          ],
        },
        {
          cols: [
            {
              label: 'Modified Attack Vector',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Unchanged Modified Attack Vector'); 
                } },
                { name: 'Network', action: () => { 
                  console.log('Changed Modified Attack Vector'); 
                } },
                { name: 'Adjacent Network', action: () => { 
                  console.log('Changed Modified Attack Vector'); 
                } },
                { name: 'Local', action: () => { 
                  console.log('Changed Modified Attack Vector'); 
                } },
                { name: 'Physical', action: () => { 
                  console.log('Changed Modified Attack Vector'); 
                } },
              ],
            },
            {
              label: 'Modified Attack Complexity',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Not Defined Modified Attack Complexity'); 
                } },
                { name: 'Low', action: () => { 
                  console.log('Low Modified Modified Attack Complexity'); 
                } },
                { name: 'High', action: () => { 
                  console.log('High Modified Modified Attack Complexity'); 
                } },
              ],
            },
            {
              label: 'Modified Privileges Required',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Not Defined Modified Privileges Required'); 
                } },
                { name: 'None', action: () => { 
                  console.log('None Modified Privileges Required'); 
                } },
                { name: 'Low', action: () => { 
                  console.log('Low Modified Privileges Required'); 
                } },
                { name: 'High', action: () => { 
                  console.log('High Modified Privileges Required'); 
                } },
              ],
            },
            {
              label: 'Modified User Interaction',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Not Defined Modified User Interaction'); 
                } },
                { name: 'None', action: () => { 
                  console.log('None Modified Modified User Interaction'); 
                } },
                { name: 'Required', action: () => { 
                  console.log('Required Modified Modified User Interaction'); 
                } },
              ],
            },
          ],
        },
        {
          cols: [
            {
              label: 'Modified Scope',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Not Defined Modified Scope'); 
                } },
                { name: 'Unchanged', action: () => { 
                  console.log('Unchanged Modified Scope'); 
                } },
                { name: 'Changed', action: () => { 
                  console.log('Changed Modified Scope'); 
                } },
              ],
            },
            {
              label: 'Modified Confidentiality',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Not Defined Modified Confidentiality'); 
                } },
                { name: 'None', action: () => { 
                  console.log('None Modified Confidentiality'); 
                } },
                { name: 'Low', action: () => { 
                  console.log('Low Modified Modified Confidentiality'); 
                } },
                { name: 'High', action: () => { 
                  console.log('High Modified Modified Confidentiality'); 
                } },
              ],
            },
            {
              label: 'Modified Integrity',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Not Defined Modified Integrity'); 
                } },
                { name: 'None', action: () => { 
                  console.log('None Modified Integrity'); 
                } },
                { name: 'Low', action: () => { 
                  console.log('Low Modified Modified Integrity'); 
                } },
                { name: 'High', action: () => { 
                  console.log('High Modified Modified Integrity'); 
                } },
              ],
            },
            {
              label: 'Modified Availability',
              buttons: [
                { name: 'Not Defined', action: () => { 
                  console.log('Not Defined Modified Availability'); 
                } },
                { name: 'None', action: () => { 
                  console.log('None Modified Availability'); 
                } },
                { name: 'Low', action: () => { 
                  console.log('Low Modified Modified Availability'); 
                } },
                { name: 'High', action: () => { 
                  console.log('High Modified Modified Availability'); 
                } },
              ],
            },
          ],
        }
      ]
    },
  ],
};