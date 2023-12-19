# Use a multi-stage build to separate the build environment from the production environment
# Build stage
FROM docker.io/selenium/standalone-chrome:latest

USER 0

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    krb5-user \
    libnss3-tools \
    tmux \
    && \
    apt-get clean

COPY chrome-redhat.json /etc/opt/chrome/policies/managed/redhat.json
COPY chrome-redhat.json /etc/chromium/policies/managed/redhat.json

COPY krb5.conf /etc/krb5.conf
COPY krb5.conf.d /etc/krb5.conf.d

#COPY --chown=1200:1201 --chmod=400 krb5.keytab /krb5/
VOLUME /keytabs/

# Uncomment for debugging
#ENV KRB5_TRACE=/dev/stderr

# Unused
#ENV KRB5CCNAME=/tmp/ccache

EXPOSE 4444
EXPOSE 7900

#uid=1200(seluser) gid=1201(seluser) groups=1201(seluser)

COPY osim-selenium_entrypoint.sh /
COPY entrypoint.d /entrypoint.d

USER 1200:1201

# from standalone-chrome:latest
#CMD ["/opt/bin/entry_point.sh"]
CMD ["/osim-selenium_entrypoint.sh"]

