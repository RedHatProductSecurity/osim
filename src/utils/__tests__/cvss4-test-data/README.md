# Notes

## Source and Maintenance

The test data for CVSS4 is currently sourced from Red Hat Product Security's [CVSS repo](https://github.com/RedHatProductSecurity/cvss). That repo's [test data](https://github.com/RedHatProductSecurity/cvss/tree/master/tests) has files ending in 4; these are the CVSS4 test data set.

## Updating Test Data

To update the CVSS4 test data from the source repository, you can use the provided script:

### Using npm script
```bash
npm run fetch-cvss4-test-data
```

### Using the script directly
```bash
# Make the script executable (first time only)
chmod +x scripts/fetch_cvss4_test_data.sh

# Run the script
./scripts/fetch_cvss4_test_data.sh
```
