# Test cases for e2e
The e2e testing are using behave and selenium for running the tests.

## Debug the test case via the selenium/browser image
Refer to the README of osim-selenium-image and Start the osim-selenium-image.

## Configure environment variables for test cases
### Define which OSIM env will be tested.
- BUGZILLA_API_KEY: export BUGZILLA_API_KEY=$BUGZILLA_API_KEY
- JIRA_API_KEY: export JIRA_API_KEY=$JIRA_API_KEY
- OSIM_URL: export OSIM_URL=$OSIM_URL
- OSIDB_URL: export OSIDB_URL=$OSIDB_URL
- SELENIUM_URL: export SELENIUM_URL=$SELENIUM_URL
# Sometimes the supported affect module could be changed due to product-definitions
- AFFECTED_MODULE_BZ: export AFFECTED_MODULE_BZ=$AFFECTED_MODULE_BZ
- AFFECTED_MODULE_JR: export AFFECTED_MODULE_JR=$AFFECTED_MODULE_JR

## Run the tests
There are a few methods how you can run test cases. Always run the commands from
osim root directory.
Before run the testing, please run kinit.
1. Run all tests using `yarn run test:e2e` or `behave`
2. Run a feature only: `behave features/$featurefile`
3. Run a scenario only: `behave -n 'scenario name'`
Note: To run scenarios with a specific tag, --tags could be used, e.g.,
- Run all scenarios tagged with tag 'skip', behave --tags @skip
- Run all scenarios except those tagged with 'skip', behave --tags ~@skip
