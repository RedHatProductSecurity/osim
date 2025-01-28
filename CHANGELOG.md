# OSIM Changelog

## [Unreleased]
### Added
* Show Flaw Labels on Flaw List Component (`OSIDB-3805`)
* Support PURLs in affected components (`OSIDB-3412`)
* Increase step value for affects and trackers per page (`OSIDB-3508`)
* Support showing all trackers/affects in single page (`OSIDB-3506`)


### Fixed
* Fix incorrect affects ordering by Impact and Resolution (`OSIDB-3480`)
* Fix incorrect embargoed state of CVSS scores (`OSIDB-3861`)

## [2024.12.1]
### Fixed
* Fix save all button behavior for affects table (`OSIDB-3664`)
* Fix loss of focus and undesirable sorting on affects being edited (`OSIDB-3700`)
* Fix CVSS not created for new affects on save (`OSIDB-3777`)

### Changed
* Move notifications to left side (`OSIDB-3543`)
* Don't show notifications when they are disabled (`OSIDB-3543`)

## [2024.12.0]
### Added
* Add component column to trackers table (`OSIDB-3721`)
* Warning when filing trackers on CVEs with low severity (`OSIDB-3429`)
* Date range filter on history (`OSIDB-3562`)

### Fixed
* Fix trackers status filter not working (`OSIDB-3720`)
* Fix duplicated values on CVSS displays (`OSIDB-3658`)
* Fix wrong advance search custom order (`OSIDB-3609`)

### Changed
* Enable manual flaw association in Trackers Manager while query for related flaws resolves (`OSIDB-3739`)

## [2024.11.1]
### Added
* Support multiple user saved searches (`OSIDB-3554`)
* Allow editing/removing/adding saved user searches (`OSIDB-3555`)
* Added pagination to history section (`OSIDB-3563`)
* Integrate CVSS Calculator on affect's CVSS editing field (`OSIDB-3434`)

### Fixed
* Time format on history dates changed from 12h to 24h (`OSIDB-3645`)
* Fix some update streams not showing until De/Select All button is clicked on PS Modules with *some but not all* trackers already filed (`OSIDB-3674`)
* Prevent flaw saving if CVSS vector is invalid (`OSIDB-3275`)
* Unable to remove affect CVSS (`OSIDB-3675`)

### Changed
* Extend advance search UI to handle multiple saved searches (`OSIDB-3556`)

## [2024.11.0]
### Added
* Add multi-flaw tracker filing (`OSIDB-3129`)
* Added new CVSS versions and issuers on flaw form (`OSIDB-3546`)

### Fixed
* Corrected BZ link overlapping flaw promotion button (`OSIDB-3529`)
* Refresh trackers after filing new trackers (`OSIDB-3483`)

### Changed
* Allow empty impact on flaw (`OSIDB-3596`)
* Indicate affect module filters functionality more clearly (`OSIDB-3509`)
  * Reflects component selections in Tracker Manager
  * Reworked Affect Offering UI to make filtering functionality clearer

## [2024.10.0]
### Added
* Extend incident types to include 'Minor' and 'Zero Day' (`OSIDB-3442`)
* Added Flaw History section (`OSIDB-3371`)
* Added new flaw reference type "Upstream" (`OSIDB-3566`)

### Fixed
* Corrected wrong tooltips on advance search, empty/non-empty buttons (`OSIDB-3502`)
* Show comment field on CVSSv3 when the score is the same but the comment is not empty (`OSIDB-3400`)
* Use UTC time for created date on flaw list (`OSIDB-3478`)
* Automatically reset affect's delegated resolution when affectedness is set to not affected (`OSIDB-3533`)

### Changed
* Display NVD CVSS when it is available (`OSIDB-3546`)

## [2024.9.2]
### Added
* Add query filter support on advance search (`OSIDB-3088`)
* Support saving query filter on default user search (`OSIDB-3387`)
* Allow emptiness advanced search on supported fields (`OSIDB-3389`)
* Add additional sortable fields for advance search results (`OSIDB-3388`)
* Added tootlips with full string value on affect/tracker fields that can be truncated (`OSIDB-3453`)
* Disable file tracking button for non saved new affects (`OSIDB-3474`)

### Fixed
* Fix swapped values on trackers `Modules` and `Stream` values (`OSIDB-3443`)
* Adding new trackers temporary populate trackers table (`OSIDB-3474`)

## [2024.9.1]
### Fixed
* Fix wrong tracker links (`OSIDB-3443`)

## [2024.9.0]
### Added
* Allow using default ordering in flaw list page (`OSIDB-3187`)
* Support operations for a selection of affects (`OSIDB-2818`)
* Support filing trackers for a selection or individual affects (`OSIDB-2818`)
* Provide default values when adding new affects (`OSIDB-2818`)
* Added different filters for affects and trackers (`OSIDB-2818`)
* Support field specific sorting for affects and trackers (`OSIDB-2818`)
* New modal view for trackers manager for individual/selected affects (`OSIDB-2818`)
* Provide Bug ID information for trackers display (`OSIDB-2818`)
* In the event of saving multiple trackers with some failing, the affect 
trackers will be refreshed (`OSIDB-3402`)
* Display score on affect's CVSS column (`OSIDB-3397`)
* Allow removing CVSS on affects (`OSIDB-3397`)

### Changed
* Improved performance by reusing access token until is expired (`OSIDB-3373`)
* Re-design of affects view (`OSIDB-2818`)
* Re-design of trackers view (`OSIDB-2818`)
* Modified layout of trackers manager (`OSIDB-2818`)
* Fetch flaws on the background to improve performance (`OSIDB-3373`)
* Add CVEORG Source for Flaw (`OSIDB-3394`)

### Fixed
* Correct `affected module` information source on trackers display (`OSIDB-2818`)
* Allow setting and modifying affect's CVSS (`OSIDB-3397`)

### Removed
* Removed `type` information for trackers display (`OSIDB-2818`)

## [2024.8.0]
### Added
* Add button to Bugzilla on public and private comments
* `DEFER` is now a possible affect resolution (`OSIDB-3286`, `OSIDB-3288`)

### Fixed
* Allow saving flaws with historical affects (`OSIDB-3262`)

## [2024.7.2]
### Fixed
* Fix comment#0 and description fields layout (`OSIDB-3174`)
* Indicate when single tracker successfully filed (`OSIDB-3144`)

### Added
* Indicate when trackers are unexpectedly not available (`OSIDB-3158`)

### Changed
* Jira suggestions are now filtered by the current project (`OSIDB-3189`)

## [2024.7.1]
### Added
* Apply modified style to references and ackowledgements cards when they differ to the saved value (`OSIDB-2905`)
* Sort affects by product family, alphabetically (`OSIDB-2533`)
* Suggestions for Flaw Owner field (`OSIDB-3004`)
* Suggestions for Jira mentions in internal comments (`OSIDB-3005`)
* Support for non empty CVE Description on advanced search (`OSIDB-3138`)

### Fixed
* Bugzilla tracker link overlaps with the workflow actions (`OSIDB-3089`)
* Duplicated loading spinner on flaw lists (`OSIDB-3092`)
* Internal comments creation fails on chrome browser (`OSIDB-3091`)
* Auto commit edited references and ackowledgements when start editting a new one (`OSIDB-2905`)
* Affects resolution is not updated after changing affectedness (`OSIDB-3123`)
* Affect CVSS scores wouldn't save properly (`OSIDB-3100`)
* Can't clear CVSS score from a flaw (`OSIDB-1843`)
* Flaw could not be saved without affects in several situations (`OSIDB-3099`)

### Removed
* Remove dirty flag from footer and from build validation process (`OSIDB-3068`)
* Being unable (with one action) simultaneously update a flaw's components and affects (`OSIDB-3100`)

### Changed
* Reload trackers after filing trackers (`OSIDB-3049`)
* Changed order of saving operations when updating a flaw (`OSIDB-3100`, `OSIDB-3099`)

## [2024.7.0]
### Changed
* Make text area descriptions layout static (always visible) (`OSIDB-2005`)

### Fixed
* Missing references and/or acknowledgements after multiple creation (`OSIDB-3066`)
* Form is not disabled during multiple references and/or acknowledgements creation (`OSIDB-3066`)
* Exclude empty state from open issues filter (`OSIDB-3067`)
* Affect CVSS scores could not be edited (`OSIDB-3042`)
* Some affects' trackers were not showing (`OSIDB-3065`, `OSIDB-3074`)

### Removed
* Remove extra whitespace and optimize UI spacing (`OSIDB-2005`)
* Remove buttons to show/hide text area descriptions (they are always visible now) (`OSIDB-2005`)

## [2024.6.2]
### Added
* Create Jira task on demand for legacy flaws (`OSIDB-2883`)
* Jira contributors field is now displayed on the Flaw form (`OSIDB-2916`)
* Hover style on Cvss Calculator buttons (`OSIDB-2511`)

### Changed
* Temporary disable private comments creation (`OSIDB-3002`)
* Enable private comments creation again (`OSIDB-3012`)
* Highlight form style for embargoed flaw (`OSIDB-2984`)
* Added Cvss Score value to Cvss Vector field (`OSIDB-2511`)

### Fixed
* Flaws without a Jira task cannot be updated (`OSIDB-2960`)
* Remove Trackers section on Flaw Edit (`OSIDB-2954`)
* Owner - Status text overlap on flaw list (`OSIDB-2827`)
* Fix Error for Duplicated Affects (`OSIDB-2894`)
* Missing Expand All button on initial Flaw load (`OSIDB-3024`)
* Formatting for Tracker table timestamps (`OSIDB-2983`)
* Inconsistent focusing on calculator fields (`OSIDB-2511`)

### Removed
* Removed Cvss Score field (`OSIDB-2511`)

## [2024.6.1]
### Added
* Support private Bugzilla comments (`OSIDB-2912`)
* Add Created At on Flaw Edit (`OSIDB-2945`)
* Add Affect affectedness on Advanced Search (`OSIDB-2951`)
* Limit Affect resolution options based on affectedness value (`OSIDB-2787`)

### Fixed
* Refresh flaw after cvss scores on create (`OSIDB-2981`)
* Flaw form not being responsive after save (`OSIDB-2948`)
* Don't update unmodified affects (`OSIDB-2946`)
* Fix CVSS score reset on Flaw reset (`OSIDB-2701`)
* Fix Flaw save with removing unsaved affects (`OSIDB-2934`)
* Manage Trackers: Eliminate unnecessary space, improve layout organization (`OSIDB-2949`, `OSIDB-2987`)
* Prevent unhelpful error notifications (`OSIDB-2962`, `OSIDB-2998`)

## [2024.6.0]
### Added
* Embedded Cvss3 calculator in `Flaw` views (`OSIDB-1204`)
* Self-Assign button for Flaws (`OSIDB-2593`)
* Provide time to Public Date field (`OSIDB-1848`)
* Add neighboring dropdown menu to Flaw Description for its review workflow (`OSIDB-2623`)
* Add CVE Require Description for AdvancedSearch (`OSIDB-2624`)
* Support for references and acknowledgements on flaw creation (`OSIDB-2319`)
* Sort Advanced Search Options alphabetically (`OSIDB-2805`)
* Add tracker links on affects and flaw form (`OSIDB-2630`)
* Add button to expand all affects (`OSIDB-2817`)
* Sort impact options logically (`OSIDB-2791`)
* Advanced search on emptiness for CVE ID (`OSIDB-2806`)
* Embedded Alerts on top of the Flaw form (`OSIDB-1211`)
* Add Incident State for AdvancedSearch (`OSIDB-2892`)
* Manage adding mulitple trackers (`OSIDB-2673`, `OSIDB-2811`)
* Hide references description when it is not set (`OSIDB-2846`)
* Create and delete Affects in single request (`OSIDB-2821`)
* Add link to bugzilla tracker on Flaw form (`OSIDB-2897`)
* Set public date to current date on unembargo (`OSIDB-2829`)
* Add CVSSv3 score explanation input field (`OSIDB-2913`)
* Remove checkbox on IssueQueue (`OSIDB-2488`)

### Changed
* Flaw URLs consists preferably of CVE ID if possible (`OSIDB-2018`)
* Changed layout for Descriptions, References and Acknowledgements
* Renamed `Description` (to Comment#0) and `Summary` (to Description)
* Made text area fields visible with empty content
* Minor style adjustments on `Flaw` views
* Validates Flaw form fields with visual fieldback 
* Provided save operation indications
* Implemented read-only mode (network requests involving write operations are disabled)
* Disables form on save
* Links on references are now displayed as urls
* Implemented Advanced Search Query to URL
* Unembargo confirmation now happens on saving flaw
* `Source` column hidden on flaw lists
* `Source` field renamed to `CVE Source` on flaw form and advanced search
* Added Total count for IndexView and AdvancedSearch Page
* Add Default Filter on IndexView Page
* Cvss vector and score fields converted to static (only editable through calculator)
* Changed affect form
  * Removed modified/unsaved affects section
  * Added UI indications for unsaved affects
  * Improved recovery/deletion UI
  * Show affectedness, resolution text
  * Update affectedness, resolution selection options
  * Add validation for duplicated component name
* Add OSV Source for Flaw
* Show Default Filter on IndexView Page
* Remove Team ID from Flaw detail page and advanced search page
* Add Errata Link for Tracker
* Switch Flaw.component to Flaw.components (`OSIDB-2777`)
* Use comment_zero instead of description from OSIDB (`OSIDB-2784`)
* Support internal flaw comments using Jira (`OSIDB-828`)
* Redesign flaw comments section (`OSIDB-2536`)
* Rename assignee to owner in flaw filter and detail pages (`OSIDB-2898`)
* Dramatically enhanced Manage Trackers UI (`OSIDB-2915`)
  * Organize by selected, unselected, and already filed
  * Limit UI space of element
  * Filter trackers by stream or component name
  * Shows recommended tracker icon
* Make `Impact`, `Public Date` and `Component` optional for a `Rejected` flaw (`OSIDB-2849`)
* Renamed Flaw Status to Flaw State (`OSIDB-2899`)
* Improve reporting on tracker filing errors (`OSIDB-2909`)
* Added timezone to Public Date field (UTC) (`OSIDB-2790`)
* Don't collapse affected modules automatically after deleting a component (only occurred when no other components were expanded) (`OSIDB-2757`)
* Add emptiness for CVSSv3, CWE ID, Owner, Description, Statement, Mitigation on Advanced Search (`OSIDB-2816`)

### Fixed
* Fixed overlap on edit buttons at References and Acknowledgements items
* Fixed inconsistent style on read-only fields with empty value
* Fixed `References` and `Acknowledgements` don't open when new item is added
* Fixed editing bugs on `References` and `Acknowledgements` lists
* Fixed `Affiliation` text overflow on `Acknowledgements` labels
* Fixed possible incorrect CVSS2 instead of CVSS3 display (`OSIDB-2308`)
* Flaw CVSS3 score is now readonly (`OSIDB-2308`)
* Flaw Comment#0 (former description) field is now writable only upon Flaw creation (`OSIDB-2308`)
* Fixed ability to create comments on public flaws
* Provide unembargo confirmation ID for Embargoed Flaws without a CVE
* Saving indication for saving Flaw edits
* Supplied missing validation indication fo Reported Date
* Removed CVE as required field
* Refreshing behavior fixed
* Fixed incorrect prompt message on `References` deletion
* Fixed `Reference` external url validation to accept `http://`
* Date Field: Restore clickability to save/cancel buttons on Date field, Fixes escape key functionality, Prevents reappearing value from cancelled edit
* Fixed NVD and RH CVSS Score diff highlight
* Fixed duplicated search option on `AdvancedSearch` page
* Fixed redirect `Flaws` link on `Flaw` edit page when `Flaw` is not found.
* Fixed Scroll bar on `Flaws` list
* Fixed 'outdated Flaw' error when updating affects, references, acknowlegdements, CVSS scores, flaw
* The session is now shared across tabs
* Fixed CVSS scores not being saved after flaw creation
* The session is now shared across tabs
* CVSS scores on affects can be added (`OSIDB-2573`)
* Disable form on references and acknowledgments save actions (`OSIDB-2645`)
* References and acknowledgments disappear after save actions (`OSIDB-2645`)
* References and acknowledgments are not refreshed after save actions (`OSIDB-2645`)
* Fixed FlawForm Remove Summary, Statement, Mitigation Button (`OSIDB-2703`)
* Restored required field validations to Flaw fields (`OSIDB-2725`)
* De/Select all button in Trackers Manager (`OSIDB-2908`)
* Save affects all at once (`OSIDB-2206`)
* Show only allowed sources for Flaw Create/Edit (`OSIDB-2395`)
* Fixed deleted affects message after flaw save (`OSIDB-2693`)
* Recover from save errors during flaw creation, show saving animation (`OSIDB-2765`)
* Prevent saving of unmodified affects (`OSIDB-2754`)
* Unable to save first cvss score on flaws (`OSIDB-2769`)
* Unable to save new references and ackowledgments on flaws (`OSIDB-2206`)
* Reset affects when flaw is reset (`OSIDB-2793`)
* New public comments are not displayed (`OSIDB-2700`)
* Fix outdated model (409) errors on saving affects (`OSIDB-2933`)
* Fix Flaw Owner self assign button to assign correct Jira username (`OSIDB-2715`)
* Fix My Issues filter on index page to filter by correct Jira usernamne (`OSIDB-2716`)

### Removed
* Removed is_major_incident usage (`OSIDB-2778`)
* Removed comment.type usage (`OSIDB-2781`)
* Removed Flaw.meta usage (`OSIDB-2801`)
* Removed cvss2 and cvss3 fields from Flaw and Affects (`OSIDB-2779`)
* Removed validation on empty references description (`OSIDB-2846`)

## [2024.1.0]

### Added
* Support `Flaw` workflow status display
* Support `Flaw` assignment
* Support JIRA API Key configuration
* Expand unit test coverage
  * Boilerplate for network-based unit tests
  * Settings
  * Initial support for `Flaw` editing

### Fixed
* Clear All button for toasts is now clickable

## [2023.11.0]
The first release for user testing, briefly reaching feature parity with OSIDB

### Added
* Various standard widgets
* Flaw commenting
* Error notifications
* `Affects` editing
* Form validation
* Early unit test coverage
* Acceptance test framework
* Runtime type checking

## [2023.7.0]
### Added
* Settings
* `Flaw` creation
* `Flaw` editing
* Quick search
* Configurable backend

## Initial release - [2023.4.0]
### Added
* Early repo layout & Flaw template

[Unreleased]: https://github.com/RedHatProductSecurity/osim/compare/v2024.12.1...HEAD
[2024.12.1]: https://github.com/RedHatProductSecurity/osim/compare/v2024.12.0...v2024.12.1
[2024.12.0]: https://github.com/RedHatProductSecurity/osim/compare/v2024.11.1...v2024.12.0
[2024.11.1]: https://github.com/RedHatProductSecurity/osim/compare/v2024.11.0...v2024.11.1
[2024.11.0]: https://github.com/RedHatProductSecurity/osim/compare/v2024.10.0...v2024.11.0
[2024.10.0]: https://github.com/RedHatProductSecurity/osim/compare/v2024.9.2...v2024.10.0
[2024.9.2]: https://github.com/RedHatProductSecurity/osim/compare/v2024.9.1...v2024.9.2
[2024.9.1]: https://github.com/RedHatProductSecurity/osim/compare/v2024.9.0...v2024.9.1
[2024.9.0]: https://github.com/RedHatProductSecurity/osim/compare/v2024.8.0...v2024.9.0
[2024.8.0]: https://github.com/RedHatProductSecurity/osim/compare/v2024.7.2...v2024.8.0
[2024.7.2]: https://github.com/RedHatProductSecurity/osim/compare/v2024.7.1...v2024.7.2
[2024.7.1]: https://github.com/RedHatProductSecurity/osim/compare/v2024.7.0...v2024.7.1
[2024.7.0]: https://github.com/RedHatProductSecurity/osim/compare/v2024.6.2...v2024.7.0
[2024.6.2]: https://github.com/RedHatProductSecurity/osim/compare/v2024.6.1...v2024.6.2
[2024.6.1]: https://github.com/RedHatProductSecurity/osim/compare/v2024.6.0...v2024.6.1
[2024.6.0]: https://github.com/RedHatProductSecurity/osim/compare/v2024.1.0...v2024.6.0
[2024.1.0]: https://github.com/RedHatProductSecurity/osim/compare/v2023.11.0...v2024.1.0
[2023.11.0]: https://github.com/RedHatProductSecurity/osim/compare/v2023.7.0...v2023.11.0
[2023.7.0]: https://github.com/RedHatProductSecurity/osim/compare/v2023.7.0...v2023.11.0
[2023.4.0]: https://github.com/RedHatProductSecurity/osim/compare/7b2b6a061cd6e30f5f53543f29271c80b08b16ff...v2023.4.0
