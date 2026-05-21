#pragma once
#include <JuceHeader.h>
#include <vector>
#include <mutex>

struct PendingNote {
    int  midiNote;
    float velocity;
    double startSample;
    double endSample;
    bool noteOnSent  = false;
    bool noteOffSent = false;
};

class TrapChordGenProcessor : public juce::AudioProcessor
{
public:
    TrapChordGenProcessor();
    ~TrapChordGenProcessor() override = default;

    // Called from the editor thread when a chord URL is intercepted
    void queueChord (const juce::Array<int>& midiNotes, double durationSeconds);

    //==============================================================================
    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    //==============================================================================
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "TrapChordGen"; }
    bool  acceptsMidi()   const override { return false; }
    bool  producesMidi()  const override { return true;  }
    bool  isMidiEffect()  const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int  getNumPrograms()  override { return 1; }
    int  getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock&) override {}
    void setStateInformation (const void*, int) override {}

    double currentSampleRate = 44100.0;

private:
    std::mutex           notesMutex;
    std::vector<PendingNote> pendingNotes;
    double samplePosition = 0.0;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (TrapChordGenProcessor)
};
