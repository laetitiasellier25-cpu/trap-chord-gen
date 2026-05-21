cmake_minimum_required(VERSION 3.22)
project(TrapChordGen VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "Minimum macOS version")

include(FetchContent)
FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG        7.0.12
    GIT_SHALLOW    TRUE
    GIT_PROGRESS   TRUE
)
FetchContent_MakeAvailable(JUCE)

juce_add_plugin(TrapChordGen
    COMPANY_NAME            "TrapChordGen"
    COMPANY_WEBSITE         "https://laetitiasellier25-cpu.github.io/trap-chord-gen/"
    IS_SYNTH                TRUE
    NEEDS_MIDI_OUTPUT       TRUE
    NEEDS_MIDI_INPUT        FALSE
    IS_MIDI_EFFECT          FALSE
    PLUGIN_MANUFACTURER_CODE Tcgn
    PLUGIN_CODE             Tcg1
    FORMATS                 VST3
    PRODUCT_NAME            "TrapChordGen"
    VST3_CATEGORIES         "Instrument" "Tools"
)

juce_generate_juce_header(TrapChordGen)

target_sources(TrapChordGen PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginEditor.cpp
)

target_compile_definitions(TrapChordGen PUBLIC
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
)

target_link_libraries(TrapChordGen PRIVATE
    juce::juce_audio_utils
    juce::juce_gui_extra
    juce::juce_recommended_config_flags
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warning_flags
)
