#include "PluginEditor.h"

static const char* SITE_URL =
    "https://laetitiasellier25-cpu.github.io/trap-chord-gen/?daw=1";

TrapChordGenEditor::TrapChordGenEditor (TrapChordGenProcessor& p)
    : AudioProcessorEditor (p), processor (p)
{
    webView.onJuceUrl = [this] (const juce::String& url) { handleChordUrl (url); };

    addAndMakeVisible (webView);
    setSize (1040, 720);
    webView.goToURL (SITE_URL);
}

void TrapChordGenEditor::paint (juce::Graphics& g)
{
    g.fillAll (juce::Colour (0xff0d0b14));
}

void TrapChordGenEditor::resized()
{
    webView.setBounds (getLocalBounds());
}

// URL format:  juce://chord?notes=C4:E4:G4&dur=2.0
void TrapChordGenEditor::handleChordUrl (const juce::String& url)
{
    // Strip scheme
    const juce::String query = url.fromFirstOccurrenceOf ("?", false, false);
    juce::StringArray params;
    params.addTokens (query, "&", "");

    juce::String notesStr;
    double durationSeconds = 1.0;

    for (const auto& param : params)
    {
        if (param.startsWith ("notes="))
            notesStr = param.fromFirstOccurrenceOf ("=", false, false);
        else if (param.startsWith ("dur="))
            durationSeconds = param.fromFirstOccurrenceOf ("=", false, false).getDoubleValue();
    }

    if (notesStr.isEmpty()) return;

    juce::StringArray noteNames;
    noteNames.addTokens (notesStr, ":", "");

    juce::Array<int> midiNotes;
    for (const auto& n : noteNames)
    {
        const int midi = noteNameToMidi (n.trim());
        if (midi >= 0 && midi <= 127)
            midiNotes.add (midi);
    }

    if (!midiNotes.isEmpty())
        processor.queueChord (midiNotes, durationSeconds);
}
