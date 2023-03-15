<script setup lang="ts">
const source = 'Some Source';
const cve_id = 'CVE-2022-1234';
const state = 'Open';
const updated_dt = '2022-03-10 13:45:00';
const unembargo_dt = '2022-03-20';
const reported_dt = '2022-03-01';
const cwe_id = 'CWE-79';
const cvss3_score = '7.5';
const impact = 'High';
const nvd_cvss3 = 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N';
const embargoed = false;
const is_major_incident = true;
</script>

<template>
    <!-- Todo: make it so that key values are populated vs static keys associated with page specific-->
    <div class="table-responsive border mb-3">
        <br/>
        <table class="table">
            <tbody>
                <tr>
                    <td>Source: {{ source }}</td>
                    <td>CVE ID: {{ cve_id }}</td>
                    <td>Status: {{ state }}</td>
                    <td>Last Update: {{ updated_dt }}</td>
                </tr>
                <tr>
                    <td>Public Date: {{ unembargo_dt }}</td>
                    <td>Report Date: {{ reported_dt }}</td>
                    <td>CWE ID: {{ cwe_id }}</td>
                    <td>CVSS Score: {{ cvss3_score }}</td>
                </tr>
                <tr>
                    <td>Severity: {{ impact }}</td>
                    <td>NVD CVSS: {{ nvd_cvss3 }}</td>
                    <td>Embargoed: {{ embargoed }}</td>
                    <td>Is Major Incident: {{ is_major_incident }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
