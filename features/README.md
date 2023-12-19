# Test cases for e2e
The e2e testing are using behave and selenium for running the tests.

## Debug the test case via the selenium/browser image
Refer to the README of osim-selenium-image and Start the osim-selenium-image.

## Configure environment variables for test cases
### Define which OSIM env will be tested.
- OSIM_URL: export OSIM_URL=$OSIM_URL

## Run the tests
There are a few methods how you can run test cases. Always run the commands from
osim root directory.

1. Run all tests using `yarn run test:e2e` or `behave`
2. Run just test one feature: `behave features/$featurefile`