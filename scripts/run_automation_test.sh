#!/bin/bash

# run this script in root dir of osim codebase, ./scripts/run_automation_test.sh


run_behave() {
    args="$@"

    # set arguments if "ci" argument is passed
    if [[ -v CI ]]; then
        args="$@ --junit --junit-directory=reports --no-summary"
    fi
    
     behave $args
     return $?
}


if ! run_behave features/login.feature; then
    echo "login to osim failed, skip the rest of tests"
    exit 1
fi

if run_behave features/flaw_create_embargo.feature; then
    run_behave features/flaw_detail_embargo.feature --tags=~@skip
else
    echo "flaw_create_embargo.feature failed, skip flaw_detail_embargo.feature"
fi

if run_behave features/flaw_create_public.feature; then
    run_behave features/flaw_detail_public.feature --tags=~@skip
else
    echo "flaw_create_public.feature failed, skip flaw_detail_public.feature"
fi

if [ -e tmp_data.txt ]
then
    run_behave features/advance_search.feature
    run_behave features/flaw_list.feature --tags=~@skip
    run_behave features/quick_search.feature
else
    echo "All flaw for test created failed, skip advance_search.feature,
    flaw_list.feature, quick_search.feature"
fi

if [ -e tmp_data.txt ]
then
    rm tmp_data.txt
fi
