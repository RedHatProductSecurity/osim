# OSIM Changelog

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

## [Unreleased] (TODO update for 2024.1.1 and 2024.2.0 releases)

### Added
* Embedded Cvss3 calculator in `Flaw` views (`OSIDB-1204`)

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

[Unreleased]: https://github.com/RedHatProductSecurity/osim/compare/v2024.6.2...HEAD
[2024.6.2]: https://github.com/RedHatProductSecurity/osim/compare/v2024.6.1...v2024.6.2
[2024.6.1]: https://github.com/RedHatProductSecurity/osim/compare/v2024.6.0...v2024.6.1
[2024.6.0]: https://github.com/RedHatProductSecurity/osim/compare/v2024.1.0...v2024.6.0
[2024.1.0]: https://github.com/RedHatProductSecurity/osim/compare/v2023.11.0...v2024.1.0
[2023.11.0]: https://github.com/RedHatProductSecurity/osim/compare/v2023.7.0...v2023.11.0
[2023.7.0]: https://github.com/RedHatProductSecurity/osim/compare/v2023.7.0...v2023.11.0
[2023.4.0]: https://github.com/RedHatProductSecurity/osim/compare/7b2b6a061cd6e30f5f53543f29271c80b08b16ff...v2023.4.0
