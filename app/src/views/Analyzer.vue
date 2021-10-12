<template>
  <div class="analyzer">
    <label for="audioFile">Upload WAV</label>...
    <input id="audioFile" type="file" accept=".wav" v-on:change="onExtractText" /> 
    <br /> <br />
    <h3>Text</h3>
    <!-- <div id="divOriginalText" style="height: 30vh; overflow: auto"></div> -->
    <textarea id="txtOriginalText" v-model="analysisResult.storyOriginalText" cols="150" rows="10" style="width: 100%" readonly></textarea>
    <textarea id="txtUpdatedText" v-model="analysisResult.storyUpdatedText" cols="150" rows="10" style="width: 100%"></textarea>
    <hr />
    <div>
    <button v-on:click="onAnalyze">Analyze</button>
    <button v-on:click="onSave">Download results</button>
    </div>
    <br />
    <h3>Key phrases</h3>
    <div id="divKeyphrases" style="height: 10vh; overflow: auto"></div>
    <h3>Named entities</h3>
    <div id="divEntities" style="height: 30vh; overflow: auto"></div>
    <h3>Sentiment analysis</h3>
    <div id="divSentiment" style="height: 30vh; overflow: auto"></div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { TextAnalyticsClient, AzureKeyCredential } from "@azure/ai-text-analytics";
import speechSdk = require('microsoft-cognitiveservices-speech-sdk');


@Component<Analyzer>({
  components: {
  },
  mounted: function() {
    this.onMounted();
  },
})
export default class Analyzer extends Vue {

  private analysisResult = {
    fileName: '',
    storyOriginalText: '',
    storyUpdatedText: '',
    keyPhraseResults: [],
    entityResults: [],
    sentimentResults: [],
    piiEntityResults: []
  };

  private txtOriginalText;
  private txtUpdatedText;
  private divSentiment;
  private divKeyphrases;
  private divEntities;

  onMounted() {
    this.txtOriginalText = document.getElementById('txtOriginalText');
    this.txtUpdatedText = document.getElementById('txtUpdatedText');
    this.divSentiment = document.getElementById('divSentiment');
    this.divKeyphrases = document.getElementById('divKeyphrases');
    this.divEntities = document.getElementById('divEntities');
  }

  onSave(e) {
    const contentUri = `data:application/json,${JSON.stringify(this.analysisResult)}`;
    let fileName = this.analysisResult.fileName.substring(0, this.analysisResult.fileName.length - ".wav".length);
    this.saveContent(contentUri, `${fileName}.json`);
  }

  async onAnalyze(e) {
    const taKey = '***';
    const taEndpoint = 'https://sol-ta.cognitiveservices.azure.com/';
    const textAnalyticsClient = new TextAnalyticsClient(taEndpoint,  new AzureKeyCredential(taKey));
    await this.keyPhraseExtraction(textAnalyticsClient, this.renderKeyPhraseResults);
    await this.entityRecognition(textAnalyticsClient, this.renderEntityResults);
    await this.sentimentAnalysis(textAnalyticsClient, this.renderSentimentResults);
    await this.piiRecognition(textAnalyticsClient, this.renderPiiEntityResults);
  }

  onExtractText(e) {
    const sKey = '***';
    const sRegion = 'australiaeast';
    const speechConfig = speechSdk.SpeechConfig.fromSubscription(sKey, sRegion);
    const audioFile = e.target.files[0];
    console.log(audioFile);
    this.init();
    this.analysisResult.fileName = audioFile.name;
    this.getTextFromAudioFile(speechConfig, audioFile);
  }

  getTextFromAudioFile(speechConfig, audioFile) {
      let audioConfig = speechSdk.AudioConfig.fromWavFileInput(audioFile); // fs.readFileSync("assets/audio/sample_1280x720_surfing_with_audio.wav"));
      let recognizer = new speechSdk.SpeechRecognizer(speechConfig, audioConfig);

      // recognizer.recognizeOnceAsync(result => {
      //     console.log(`RECOGNIZED: Text=${result.text}`);
      //     recognizer.close();
      // });
      recognizer.recognizing = (s, e) => {
          console.log(`RECOGNIZING: Text=${e.result.text}`);
      };
      recognizer.recognized = (s, e) => {
          if (e.result.reason == speechSdk.ResultReason.RecognizedSpeech) {
              console.log(`RECOGNIZED: Text=${e.result.text}`);
              this.analysisResult.storyOriginalText += e.result.text + ' ';
              // this.txtOriginalText.value += e.result.text + '<br/>';
              // this.speak(speechConfig, e.result.text);
          }
          else if (e.result.reason == speechSdk.ResultReason.NoMatch) {
              console.log("NOMATCH: Speech could not be recognized.");
          }
      };
      recognizer.canceled = (s, e) => {
          console.log(`CANCELED: Reason=${e.reason}`);

          if (e.reason == speechSdk.CancellationReason.Error) {
              console.log(`"CANCELED: ErrorCode=${e.errorCode}`);
              console.log(`"CANCELED: ErrorDetails=${e.errorDetails}`);
              console.log("CANCELED: Did you update the key and location/region info?");
          }

          recognizer.stopContinuousRecognitionAsync();
      };
      recognizer.sessionStopped = (s, e) => {
          console.log("\n    Session stopped event.");
          recognizer.stopContinuousRecognitionAsync();
          // this.analysisResult.storyOriginalText = this.txtOriginalText.value;
          console.log('original', this.analysisResult.storyOriginalText);
          this.analysisResult.storyUpdatedText = this.analysisResult.storyOriginalText;
          // this.analyzeStoryText();
      };

      recognizer.startContinuousRecognitionAsync();
    }

    async sentimentAnalysis(client, callback) {
        const sentimentInput = [
          this.analysisResult.storyUpdatedText
        ];
        const sentimentResults = await client.analyzeSentiment(sentimentInput);

        this.analysisResult.sentimentResults = sentimentResults;
        
        if(callback) {
          callback();
        }
    }

    async keyPhraseExtraction(client, callback){

      const keyPhrasesInput = [
        this.analysisResult.storyUpdatedText
      ];
      const keyPhraseResults = await client.extractKeyPhrases(keyPhrasesInput);
      this.analysisResult.keyPhraseResults = keyPhraseResults;

      if(callback) {
        callback();
      }
    }

    async entityRecognition (client, callback) {

        const entityInputs = [
          this.analysisResult.storyUpdatedText
        ];
        const entityResults = await client.recognizeEntities(entityInputs);

        this.analysisResult.entityResults = entityResults;

        if(callback) {
          callback();
        }
    }

    async piiRecognition(client, callback) {

        const documents = [
          this.analysisResult.storyUpdatedText
        ];

        const results = await client.recognizePiiEntities(documents, "en");
        this.analysisResult.piiEntityResults = results;

        if(callback) {
          callback();
        }
    }

    speak(speechConfig, inputText) {
      let synthesizer = new speechSdk.SpeechSynthesizer(speechConfig);

      synthesizer.speakTextAsync(
        inputText,
        (result) => {
          if (result.reason === speechSdk.ResultReason.SynthesizingAudioCompleted) {
            console.log("synthesis finished for [" + inputText + "].\n");
          } else if (result.reason === speechSdk.ResultReason.Canceled) {
            console.log("synthesis failed. Error detail: " + result.errorDetails + "\n");
          }
          console.log(result);
          synthesizer.close();
          synthesizer = undefined;
        },
        (err) => {
          console.log(err);

          synthesizer.close();
          synthesizer = undefined;
        }
      );
    }

    saveContent(contentUri: any, fileName: string) {
        let link = document.createElement('a');
        link.download = fileName;
        link.href = contentUri;
        link.click();
    }

    private init() {
      this.analysisResult = {
        fileName: '',
        storyOriginalText: '',
        storyUpdatedText: '',
        sentimentResults: [],
        keyPhraseResults: [],
        entityResults: [],
        piiEntityResults: []
      };
      // this.txtOriginalText.value = '';
      // this.txtUpdatedText.value = '';
      this.divSentiment.innerHTML = '';
      this.divKeyphrases.innerHTML = '';
    }

    private renderSentimentResults() {
      const div = this.divSentiment;
      this.analysisResult.sentimentResults.forEach(document => {
          div.innerText += `ID: ${document.id}` + '\n';
          div.innerText += `\tDocument Sentiment: ${document.sentiment}` + '\n';
          div.innerText += `\tDocument Scores:` + '\n';
          div.innerText += `\t\tPositive: ${document.confidenceScores.positive.toFixed(2)} \tNegative: ${document.confidenceScores.negative.toFixed(2)} \tNeutral: ${document.confidenceScores.neutral.toFixed(2)}` + '\n';
          div.innerText += `\tSentences Sentiment(${document.sentences.length}):` + '\n';
          document.sentences.forEach(sentence => {
              div.innerText += `\t\tSentence sentiment: ${sentence.sentiment}` + '\n';
              div.innerText += `\t\tSentences Scores:` + '\n';
              div.innerText += `\t\tPositive: ${sentence.confidenceScores.positive.toFixed(2)} \tNegative: ${sentence.confidenceScores.negative.toFixed(2)} \tNeutral: ${sentence.confidenceScores.neutral.toFixed(2)}` + '\n';
          });
      });
    }

    private renderKeyPhraseResults() {
      const div = this.divKeyphrases;
      this.analysisResult.keyPhraseResults.forEach(document => {
          div.innerHTML += `ID: ${document.id}` + '<br />';
          div.innerHTML += `\tDocument Key Phrases: ${document.keyPhrases.map(kp => `<a href="https://www.bing.com/maps?q=${kp}" target="_blank">${kp}</>`)}`;
      });
    }

    private renderEntityResults() {
      const div = this.divEntities;
      this.analysisResult.entityResults.forEach(document => {
          console.log(`Document ID: ${document.id}`);
          document.entities.forEach(entity => {
              div.innerHTML += `\tName: ${entity.text} \tCategory: ${entity.category} \tSubcategory: ${entity.subCategory ? entity.subCategory : "N/A"}` + '<br />';
              div.innerHTML += `\tScore: ${entity.confidenceScore}` + '<br />';
          });
      });
    }

    private renderPiiEntityResults() {
        for (const result of this.analysisResult.piiEntityResults) {
            if (result.error === undefined) {
                console.log("Redacted Text: ", result.redactedText);
                console.log(" -- Recognized PII entities for input", result.id, "--");
                for (const entity of result.entities) {
                    console.log(entity.text, ":", entity.category, "(Score:", entity.confidenceScore, ")");
                }
            } else {
                console.error("Encountered an error:", result.error);
            }
        }
    }

}
</script>
