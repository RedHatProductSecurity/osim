import axios from 'axios';

export async function getFlaws() {
  // TODO add filtering parameters
  // axios.get('http://127.0.0.1:4010/osidb/api/v1/flaws?bz_id=999.1777106091507&changed_after=2016-05-25T04%3A00%3A00.0Z&changed_before=1953-04-15T05%3A00%3A00.0Z&created_dt=1997-02-22T05%3A00%3A00.0Z&cve_id=suscipit,quia,dignissimos&cvss2=nobis&cvss2_score=-3.12820402011057e%2B38&cvss3=nam&cvss3_score=2.2240193839647933e%2B38&cwe_id=reprehenderit&description=sed&embargoed=false&exclude_fields=pariatur&flaw_meta_type=enim,sed,enim&impact=LOW&include_fields=et,quisquam,sunt,aut&include_meta_attr=ullam,libero,at,alias&reported_dt=1972-11-30T00%3A00%3A00.0Z&resolution=DUPLICATE&search=unde&source=PHP&state=NEW&statement=sunt&summary=maiores&title=reprehenderit&tracker_ids=eum,cum,at,odio,a&type=WEAKNESS&unembargo_dt=1949-12-22T00%3A00%3A00.0Z&updated_dt=1973-03-16T05%3A00%3A00.0Z&uuid=c605cdc8-0f63-c5ec-d32d-75c184147eba')
  // axios.get('https://osidb-stage.example.com/osidb/api/v1/flaws')
  return axios.get('/mock/staging-flaws.json')
}

export async function getFlaw(uuid: string) {
  return axios.get('/mock/staging-flaws.json')
      .then(response => {
        const flaw = response.data.results.find((flaw: { uuid: string; }) => flaw.uuid === uuid);
        return flaw;
      })
}
