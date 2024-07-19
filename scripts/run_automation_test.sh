#!/bin/bash

# run this script on root dir or osim codebase, ./scripts/run_automation_test.sh

if ! behave features/login.feature; then
    echo "login to osim failed, skip the rest of tests"
    exit 1
fi

if behave features/flaw_create_embargo.feature; then
    behave features/flaw_detail_embargo.feature
else
    echo "flaw_create_embargo.feature failed, skip flaw_detail_embargo.feature"
fi

if behave features/flaw_create_public.feature; then
    behave features/flaw_detail_public.feature
else
    echo "flaw_create_public.feature failed, skip flaw_detail_public.feature"
fi

if [ -e flaw_id.txt ]
then
    behave features/advance_search.feature
    behave features/flaw_list.feature
    behave features/quick_search.feature
else
    echo "All flaw for test created failed, skip advance_search.feature,
    flaw_list.feature, quick_search.feature"
fi

if [ -e flaw_id.txt ]
then
    rm flaw_id.txt
fi