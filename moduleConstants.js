let CNST =
 {
    EXECUTE_PHASE_COMMAND:"execute",
    HOME_PHASE_COMMAND:"home",
    RETURN_PHASE_COMMAND:"return",
    META_RETURN_CONTEXT:"returnContext",
    META_HOME_CONTEXT:"homeContext",
    META_WAITSTACK:"waitStack"
};

$$.CONSTANTS.mixIn(CNST);

module.exports = CNST;