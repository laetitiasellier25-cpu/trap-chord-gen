#pragma once
#include <JuceHeader.h>
#include "PluginProcessor.h"

// Note name → MIDI number  (e.g. "C4" → 60, "F#3" → 54)
static int noteNameToMidi (const juce::String& name)
{
    if (name.isEmpty()) return -1;

    static const char* names[] = { "C","C#","D","D#","E","F","F#","G","G#","A","A#","B" };
    const juce::String pc = name.trimCharactersAtEnd ("0123456789-");
    int semitone = -1;
    for (int i = 0; i < 12; ++i)
        if (pc.equalsIgnoreCase (names[i])) { semitone = i; break; }

    if (semitone < 0) return -1;

    // handle flat aliases
    const juce::String pcU = pc.toUpperCase();
    if      (pcU == "DB") semitone = 1;
    else if (pcU == "EB") semitone = 3;
    else if (pcU == "GB") semitone = 6;
    else if (pcU == "AB") semitone = 8;
    else if (pcU == "BB") semitone = 10;

    const int octave = name.getTrailingIntValue();
    return (octave + 1) * 12 + semitone;
}

// Subclass WebBrowserComponent to intercept juce:// URLs sent by the web app
class ChordWebView : public juce::WebBrowserComponent
{
public:
    std::function<void(const juce::String&)> onJuceUrl;

    bool pageAboutToLoad (const juce::String& url) override
    {
        if (url.startsWith ("juce://") && onJuceUrl)
        {
            juce::MessageManager::callAsync ([this, url] { onJuceUrl (url); });
            return false; // cancel navigation
        }
        return true;
    }
};

class TrapChordGenEditor : public juce::AudioProcessorEditor
{
public:
    explicit TrapChordGenEditor (TrapChordGenProcessor&);
    ~TrapChordGenEditor() override = default;

    void paint (juce::Graphics&) override;
    void resized() override;

private:
    TrapChordGenProcessor& processor;
    ChordWebView webView;

    // Parse juce://chord?notes=C4:E4:G4&dur=2.0 and queue MIDI
    void handleChordUrl (const juce::String& url);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (TrapChordGenEditor)
};
