# OSIM Selenium + Kerberos Image

## selenium only (docker/podman)

1. Create the keytab. The `-f` flag is required.  
   Place the `krb5.keytab` file in the `keytabs` directory.  
   (note: realms are ALL CAPS)
```
[user@host ~]$ ktutil
ktutil:  addent -password -p user@REALM.EXAMPLE.COM -k 1 -e aes256-cts-hmac-sha1-96 -f
Password for user@REALM.EXAMPLE.COM:
ktutil:  wkt krb5.keytab
ktutil:  quit
[user@host]$ klist -kt krb5.keytab
Keytab name: FILE:krb5.keytab
KVNO Timestamp           Principal
---- ------------------- ------------------------------------------------------
   1 12/31/2023 23:59:59 user@REALM.EXAMPLE.COM
[user@host ~]$ 
```
3. `./build.sh`
4. `./run.sh`
5. To manually use the browser, visit  
   <http://localhost:7900/?autoconnect=1&resize=scale&password=secret>  
   and open Chrome from the right-click menu (Applications -> Network -> Web Browsing -> Chrome).
6. Visit OSIM in Chrome

---

Known issues:
* The login button needs to be clicked twice. After it fails once, it succeeds. Chrome bug?

## osim-selenium + osim (docker-compose/podman-compose)

Using docker-compose can make it easier for the browser in osim-selenium to reach a local OSIM server.

### Configuration prerequisites
1. Create the keytab following the steps in the section above.
2. Create the .env files and update the values:
```
cp osim.env.example osim.env
cp osim-selenium.env.example osim-selenium.env
```
3. Place the Kerberos realms.conf config file inside krb5.conf.d/
4. Place any custom init scripts in entrypoint.d/

### Build and run
1. Run `podman-compose build` (or docker-compose build)
2. Run `podman-compose up`
3. To manually use the browser, visit  
   <http://localhost:7900/?autoconnect=1&resize=scale&password=secret>  
   and open Chrome from the right-click menu (Applications -> Network -> Web Browsing -> Chrome).
4. Visit <http://osim:8080> in Chrome

* You can remove the containers with `podman-compose down`

---

Known issues:
* The hosted osidb CORS configuration needs to be updated, adding `Access-Control-Allow-Origin: http://osim:8080`
