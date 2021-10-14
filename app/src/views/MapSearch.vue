<template>
  <section>
    <div style="padding-left: 30px; position: absolute; top: 50px; z-index: 100">
      <input id="txtSearch" type="text" />
      <button v-on:click="search">Search</button>
    </div>
    <div id="divPlayer" style="position: absolute; top: 50px; right: 200px; z-index: 100; display: none;">
      <video id="player" controls>
          Sorry, your browser doesn't support embedded videos.
      </video>
      <br/>
      <div style="text-align: right">
        <button v-on:click="closePlayer()">x</button>
      </div>
    </div>
    <br /><br />
    <div class="map" id="divMap" style='width: 100vw; height: 100vh; position: absolute; top: 0;'>
    </div>
  </section>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';


declare const Microsoft: any;

@Component<MapSearch>({
  components: {
  },
  mounted: function () {
    this.onMounted();
  },
})
export default class MapSearch extends Vue {

  private map;
  private infobox;
  private data: any[] = [];
  private divPlayer;
  private player;
  private currentPin;

  private fileNames = [
    'Dan R\'s Story.json',
    'Dougs Story.json',
    'Gail\'s Story.json',
    'Heni OHare.json',
    'Jason\'s Story.json',
    'John O\'Hare.json',
    'Jons Story.json',
    'Lucy.json',
    'Lyn\'s korero.json',
    'Pauline Owen.json',
    'Tahu\'s Story.json',
  ];

  private onMounted() {
    // const urlParams = new URLSearchParams(window.location.search);
    // this.q = urlParams.get('q');
    (window as any).onLoadBingMapsApi = () => this.loadMap();
    this.fileNames.map(fn => {
      this.loadData(fn);
    });
    this.divPlayer = document.getElementById('divPlayer');
    this.player = document.getElementById('player') as HTMLMediaElement;
  }


  loadData(fileName) {
    const $path = `./assets/stories/${fileName}`;
    fetch($path).then(response => {
      response.json().then(d => {
        this.data.push(d);
        setTimeout(() => {
          this.drawResults([d]); //13.716157, 101.075009
          this.map.setView({ center: { latitude: 13.716157, longitude: 101.075009 }, zoom: 2 });
        }, 100);
    });
});

  }

  loadMap(): void {
      this.map = new Microsoft.Maps.Map(
          document.getElementById('divMap'),
          {
              credentials: '***',
              zoom: 5
          }
      );
    this.infobox = new Microsoft.Maps.Infobox(this.map.getCenter(), { title: 'Map Center', description: '', visible: false,
      maxHeight: 300, maxWidth: 500,
      actions: [
        { label: 'Play', eventHandler: (e) => { this.startPlayer(e); } }
      ] });
      this.infobox.setMap(this.map);
      // this.drawResults(this.data);
    }

    search() {
      const q = (document.getElementById('txtSearch') as HTMLInputElement).value;
      const re = new RegExp(q, 'i');
      const results = this.data.filter(d => d.keyPhraseResults[0].keyPhrases.filter(kp => re.test(kp)).length > 0);
      console.log(results);
      this.map.entities.clear();
      this.drawResults(results);
    }

  private drawResults(results: any[]) {
    results.map(r => {
      if(r.updatedLocation) {
        const pin = new Microsoft.Maps.Pushpin(r.updatedLocation, { color: '#0f0' });
        pin.userData = r;
        this.map.entities.push(pin);
        Microsoft.Maps.Events.addHandler(pin, 'click', (e) => {
          this.currentPin = pin;
          this.infobox.setOptions({
            location: e.target.getLocation(),
            visible: true,
            title: r.fileName.substring(0, r.fileName.length-'.txt'.length),
            description: r.storyUpdatedText
          });
        });
      }
    });
    if(results[0]&&results[0].updatedLocation) {
      this.map.setView({ center: results[0].updatedLocation, zoom: 6 });
    }
  }

  closePlayer() {
    this.divPlayer.style.display = 'none';
    this.player.pause();
  }

  startPlayer(e) {
    console.log(e);
    if(this.currentPin.userData.videoFileName) {
      this.divPlayer.style.display = '';
      this.player.src = '/assets/stories/' + this.currentPin.userData.videoFileName;
      this.player.play();
    }
    else {
      alert('This story does not have a video yet.');
    }
  }
}
</script>
