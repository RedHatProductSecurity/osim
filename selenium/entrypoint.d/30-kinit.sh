#!/bin/bash

set -x
set -e

cleanup() { rm -f /tmp/krb5.keytab; }
trap cleanup EXIT
sudo install -o"$(id -u)" -g"$(id -g)" -m400 /keytabs/krb5.keytab /tmp/krb5.keytab

principal="$( klist -kt /tmp/krb5.keytab | grep -Eo -m1 '\w+@[A-Z.]+' )"
kinit -k -t /tmp/krb5.keytab "$principal"
klist

cleanup

