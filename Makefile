# Values Compass build tasks.
#
# The site itself is static and needs no build. The only generated artefacts are
# the narrated methodology and its timing sidecar, which are committed because
# they are small (~5 MB) and change only when the methodology prose does.

PYTHON ?= python3
NARRATE := scripts/narrate.py
SOURCE  := methodology.html
AUDIO   := audio/methodology.mp3
TIMING  := audio/methodology.json

.PHONY: help audio audio-check narrate-preview test parties electorates clean-audio

help:
	@echo "make audio          rebuild the narration if methodology.html is newer"
	@echo "make audio-check    report whether the narration is stale (CI uses this)"
	@echo "make narrate-preview  print what would be spoken, synthesising nothing"
	@echo "make test           run the node test suite and the data builders"

# The mp3 depends on the prose. Note that narrate.py also rewrites $(SOURCE) to
# add the sentence spans, so a rebuild touches its own prerequisite; the
# recipe therefore touches the outputs last to keep make's ordering honest.
$(AUDIO) $(TIMING): $(SOURCE) $(NARRATE)
	$(PYTHON) $(NARRATE)
	@touch $(AUDIO) $(TIMING)

audio: $(AUDIO)

narrate-preview:
	@$(PYTHON) $(NARRATE) --dry-run

# Exits non-zero when the built narration does not match the current prose.
# Compares a hash of the spoken text, not mtimes: a git checkout does not
# preserve timestamps, so CI could not use those.
audio-check:
	@$(PYTHON) $(NARRATE) --check

test:
	node --test
	node scripts/build-parties.js --check
	node scripts/build-electorates.js --check

parties:
	node scripts/build-parties.js

electorates:
	node scripts/build-electorates.js

clean-audio:
	rm -f $(AUDIO) $(TIMING)
