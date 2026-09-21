/* VAANI PYQ paper manifest.
   This is the ONLY file you edit when adding a new paper.
   1. Drop the new data/pyq/<year>-<session>.js file in this folder.
   2. Add its name to this array, exactly as the filename (no .js).
   3. Save. That's it — index.html loads whatever is listed here,
      in the normal synchronous way every other script on the page
      loads, so there is nothing that can silently fail to appear.

   NDA vs CDS: a paper file's content decides which exam it belongs to,
   not its filename or its position in this array — index.html tells
   them apart by the variable name declared inside the file:
     - `var PYQ_<year>_<session> = [...]`      -> NDA (default)
     - `var PYQ_CDS_<year>_<session> = [...]`  -> CDS
   For human clarity, name CDS files `cds-<year>-<session>.js` (e.g.
   "cds-2020-I"), but still just list the filename below like every
   other entry — everything else (archive, counts, era grouping) picks
   it up automatically from the variable name. */
var PYQ_PAPER_FILES = [
  "2009-I","2009-II",
  "2010-I","2010-II",
  "2011-I","2011-II",
  "2012-I","2012-II",
  "2013-I","2013-II",
  "2014-I","2014-II",
  "2015-I","2015-II",
  "2016-I","2016-II",
  "2017-I","2017-II",
  "2018-I","2018-II",
  "2019-I","2019-II",
  "2020-I",
  "2021-I","2021-II",
  "2022-I","2022-II",
  "2023-I","2023-II",
  "2024-I","2024-II",
  "2025-I","2025-II",
];
