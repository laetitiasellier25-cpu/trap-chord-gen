#include "PluginProcessor.h"
#include "PluginEditor.h"

TrapChordGenProcessor::TrapChordGenProcessor()
    : AudioProcessor (BusesProperties()
          .withOutput ("Output", juce::AudioChannelSet::stereo(), true))
{}

void TrapChordGenProcessor::prepareToPlay (double sampleRate, int)
{
    currentSampleRate = sampleRate;
    samplePosition    = 0.0;

    std::lock_guard<std::mutex> lock (notesMutex);
    pendingNotes.clear();
}

void TrapChordGenProcessor::queueChord (const juce::Array<int>& midiNotes,
                                        double durationSeconds)
{
    std::lock_guard<std::mutex> lock (notesMutex);
    const double durSamples = durationSeconds * currentSampleRate;
    for (int note : midiNotes)
        pendingNotes.push_back ({ note, 0.80f,
                                  samplePosition,
                                  samplePosition + durSamples });
}

void TrapChordGenProcessor::processBlock (juce::AudioBuffer<float>& buffer,
                                          juce::MidiBuffer&         midi)
{
    buffer.clear();

    std::lock_guard<std::mutex> lock (notesMutex);
    const double blockStart = samplePosition;
    const double blockEnd   = samplePosition + buffer.getNumSamples();

    for (auto& n : pendingNotes)
    {
        if (!n.noteOnSent && n.startSample >= blockStart && n.startSample < blockEnd)
        {
            int offset = juce::jlimit (0, buffer.getNumSamples() - 1,
                                       (int)(n.startSample - blockStart));
            midi.addEvent (juce::MidiMessage::noteOn  (1, n.midiNote, n.velocity), offset);
            n.noteOnSent = true;
        }
        if (n.noteOnSent && !n.noteOffSent && n.endSample >= blockStart && n.endSample < blockEnd)
        {
            int offset = juce::jlimit (0, buffer.getNumSamples() - 1,
                                       (int)(n.endSample - blockStart));
            midi.addEvent (juce::MidiMessage::noteOff (1, n.midiNote, 0.0f), offset);
            n.noteOffSent = true;
        }
    }

    pendingNotes.erase (
        std::remove_if (pendingNotes.begin(), pendingNotes.end(),
                        [] (const PendingNote& n) { return n.noteOffSent; }),
        pendingNotes.end());

    samplePosition += buffer.getNumSamples();
}

juce::AudioProcessorEditor* TrapChordGenProcessor::createEditor()
{
    return new TrapChordGenEditor (*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new TrapChordGenProcessor();
}
