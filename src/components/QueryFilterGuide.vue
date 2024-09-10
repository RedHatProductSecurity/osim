<script setup lang="ts">

</script>

<template>
  <div class="p-2">
    <div id="content-main">
      <div class="module">
        <h2 id="search-conditions">Search conditions</h2>
        <p>
          A search condition is a basic search query building block. It always
          consists of 3 elements: <code>field</code>,
          <code>comparison operator</code> and <code>value</code>, placed exactly
          in this order from left to right.
        </p>
        <p>
          <strong>Example 1</strong>
          - looking for flaws with customer source, where <code>source</code> is a <code>field</code>,
          <code>=</code> is a <code>comparison operator</code> and <code>"CUSTOMER"</code> is a <code>value</code>:
        </p>
        <pre>source = "CUSTOMER"</pre>
        <p>
          <strong>Example 2</strong> - looking for flaws created in 2017 or later:
        </p>
        <pre>created_dt >= "2017-01-01"</pre>
        <p><strong>Example 3</strong> - looking for a flaw title pattern matching:</p>
        <pre>title startswith "RHEL"</pre>
        <p><strong>Example 4</strong> - finding all flaws whose impacts are in a given list:</p>
        <pre>impact in ("LOW", "MODERATE")</pre>
      </div>
      <div class="module">
        <h2 id="multiple-search-conditions">Multiple search conditions</h2>
        <p>
          You can combine multiple search conditions together using the logical
          operators <code>and</code> (both conditions must be true) and
          <code>or</code> (at least one of the conditions must be true, no matter
          which one).
        </p>
        <p class="warn"><strong>Important:</strong> logical operators must be written in lowercase:
          <code>and</code> and <code>or</code> is correct, and <code>AND</code> or
          <code>OR</code> is incorrect and will cause an error.
        </p>
        <p>
          <strong>Example 5</strong> - looking for flaws with owner "John@example.com" <code>and</code>
          updated in 2017 or later. Please note that we have 2 search
          conditions here, joined with <code>and</code>:
        </p>
        <pre>owner = "John@example.com" and updated_dt >= "2017-01-01"</pre>
        <p>
          <strong>Example 6</strong> - looking for flaws which have 'RHEL' either in the title
          <code>or</code> the description:
        </p>
        <pre>title ~ "RHEL" or cve_description ~ "RHEL"</pre>
        <p class="info">
          <strong>Tip:</strong> if your query contains both
          <code>and</code> and <code>or</code> operators, we strongly encourage
          to use parenthesis to specify the precedence of operators.
        </p>
        <p>
          <strong>Example 7</strong> - get flaws which are either in triage state <code>or</code> with nvd source,
          <code>and</code> created in 2017 or later.
        </p>
        <pre>(classification.state = "TRIAGE" or source = "NVD") and created_dt > "2017-01-01"</pre>
      </div>
      <div class="module">
        <h2 id="fields">OSIDB Fields</h2>
        <p>
          In a search query, you should reference the osidb model's fields
          exactly as they're defined. Search query input has an auto-completion
          feature that pops up automatically and suggests all available options.
          If you're not sure what the field name is, then pick one of the options displayed.
        </p>
      </div>
      <div class="module">
        <h2 id="related-models">Related models</h2>
        <p>
          Query filter automatically handles model relations under the hood. Use the
          <code>.</code> dot separator to designate related models and their
          fields.
        </p>
        <p><strong>Example 8</strong>:</p>
        <pre>classification.state in ("NEW", "TRIAGE")</pre>
        <p>
          When you'd like to find records that are linked (or not linked)
          to any related models of that kind. In such a case, you should compare
          the related model to a special <code>None</code> value, like this:
        </p>
        <p><strong>Example 9</strong>:</p>
        <pre>affects = None</pre>
        <p>
          The example above would search for flaws that don't have any affect.
          If you'd like to find all flaws that contains at least one affect instead, use <code>!= None</code>:
        </p>
        <pre>affects != None</pre>
      </div>
      <div class="module">
        <h2 id="comparison-operators">Comparison operators</h2>
        <table class="w-100">
          <thead>
            <tr>
              <th>Operator</th>
              <th>Meaning</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>=</td>
              <td>equals</td>
              <td>first_name = "John"</td>
            </tr>
            <tr>
              <td>!=</td>
              <td>does not equal</td>
              <td>id != 42</td>
            </tr>
            <tr>
              <td>~</td>
              <td>contains a substring</td>
              <td>email ~ "@gmail.com"</td>
            </tr>
            <tr>
              <td>!~</td>
              <td>does not contain a substring</td>
              <td>username !~ "test"</td>
            </tr>
            <tr>
              <td>startswith</td>
              <td>starts with a substring</td>
              <td>last_name startswith "do"</td>
            </tr>
            <tr>
              <td>not startswith</td>
              <td>does not start with a substring</td>
              <td>last_name not startswith "do"</td>
            </tr>
            <tr>
              <td>endswith</td>
              <td>ends with a substring</td>
              <td>last_name endswith "oe"</td>
            </tr>
            <tr>
              <td>not endswith</td>
              <td>does not end with a substring</td>
              <td>last_name not endswith "oe"</td>
            </tr>
            <tr>
              <td>&gt;</td>
              <td>greater</td>
              <td>date_joined > "2017-02-28"</td>
            </tr>
            <tr>
              <td>&gt;=</td>
              <td>greater or equal</td>
              <td>id >= 9000</td>
            </tr>
            <tr>
              <td>&lt;</td>
              <td>less</td>
              <td>id &lt; 9000</td>
            </tr>
            <tr>
              <td>&lt;=</td>
              <td>less or equal</td>
              <td>last_login &lt;= "2017-02-28 14:53" </td>
            </tr>
            <tr>
              <td>in</td>
              <td>value is in the list</td>
              <td>first_name in ("John", "Jack", "Jason")</td>
            </tr>
            <tr>
              <td>not in</td>
              <td>value is not in the list</td>
              <td>id not in (42, 9000)</td>
            </tr>
          </tbody>
        </table>
        <p class="info">Notes:
          <ol>
            <li>
              <code>~</code> and <code>!~</code> operators can be applied only to
              string and date/datetime fields. A date/datetime field will be handled
              as a string one (ex., <code>payment_date ~ "2020-12-01"</code>)
            </li>
            <li>
              <code>startswith</code>, <code>not startswith</code>,
              <code>endswith</code>, and <code>not endswith</code> can be applied
              to string fields only;
            </li>
            <li>
              <code>True</code>, <code>False</code> and <code>None</code> values can
              be combined only with <code>=</code> and <code>!=</code>;
            </li>
            <li>
              <code>in</code> and <code>not in</code> operators must be written in
              lowercase. <code>IN</code> or <code>NOT IN</code> is incorrect and
              will cause an error.
            </li>
          </ol>
        </p>
      </div>
      <div class="module">
        <h2 id="values">Values</h2>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Examples</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>string</td>
              <td nowrap><code>"this is a string"</code></td>
              <td>
                Strings must be enclosed in double quotes, like
                <code>"this"</code>. If your string contains double quote
                symbols in it, you should escape them with a backslash,
                like this: <code>"this is a string with \"quoted\" text"</code>.
              </td>
            </tr>
            <tr>
              <td>int</td>
              <td nowrap><code>42</code>, <code>0</code>, <code>-9000</code></td>
              <td>
                Integer numbers are just digits with optional unary minus. If
                you're typing big numbers please don't use thousand separators,
                DjangoQL doesn't understand them.
              </td>
            </tr>
            <tr>
              <td>float</td>
              <td nowrap>
                <code>3.14</code>, <code>-0.5</code>, <code>5.972e24</code>
              </td>
              <td>
                Floating point numbers look like integer numbers with optional
                fractional part separated with dot. You can also use
                <code>e</code> notation to specify power of ten. For example,
                <code>5.972e24</code> means <code>5.972 * 10<sup>24</sup></code>.
              </td>
            </tr>
            <tr>
              <td>bool</td>
              <td nowrap>
                <code>True</code>, <code>False</code>
              </td>
              <td>
                Boolean is a special type that accepts only two values:
                <code>True</code> or <code>False</code>. These values are
                case-sensitive, you should write <code>True</code> or
                <code>False</code> exactly like this, with the first letter in
                uppercase and others in lowercase, without quotes.
              </td>
            </tr>
            <tr>
              <td>date</td>
              <td nowrap>
                <code>"2017-02-28"</code>
              </td>
              <td>
                Dates are represented as strings in <code>"YYYY-MM-DD"</code>
                format.
              </td>
            </tr>
            <tr>
              <td>datetime</td>
              <td nowrap>
                <code>"2017-02-28 14:53"</code><br>
                <code>"2017-02-28 14:53:07"</code>
              </td>
              <td>
                Date and time can be represented as a string in
                <code>"YYYY-MM-DD HH:MM"</code> format, or optionally with seconds
                in <code>"YYYY-MM-DD HH:MM:SS"</code> format (24-hour clock).
                Please note that comparisons with date and time are performed in
                the server's timezone, which is usually UTC.
              </td>
            </tr>
            <tr>
              <td>null</td>
              <td nowrap>
                <code>None</code>
              </td>
              <td>
                This is a special value that represents an absence of any value:
                <code>None</code>. It should be written exactly like this, with
                the first letter in uppercase and others in lowercase, without
                quotes. Use it when some field in the database is
                nullable (i.e. can contain NULL in SQL terms) and you'd like to
                search for records which either have no value
                (<code>some_field = None</code>) or have some value
                (<code>some_field != None</code>).
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/scss/bootstrap-overrides';

h1,
h2,
h3,
h4,
h5 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

p {
  margin-block: 0.75rem;
  margin-bottom: 0.25rem !important;
}

pre {
  background-color: $redhat-gray-30;
  padding: 1ch;
  margin-bottom: 0.25rem !important;
  border-radius: 0.25rem;
}

code {
  font-size: 1.5ch;
}

p.info,
p.warn {
  border: 0.1rem solid $redhat-teal-30;
  border-radius: 0.25rem;
  padding: 0.75ch;
}

p.info {
  background-color: $redhat-teal-10;
  border: 0.1rem solid $redhat-teal-30;
}

p.warn {
  background-color: $redhat-yellow-10;
  border: 0.1rem solid $redhat-yellow-30;
}

#search-conditions {
  margin-top: 0 !important;
}
</style>
