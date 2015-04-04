# ServiceWorkerハッカソン

ブラウザ上で動くパッケージマネージャ作った。
https://vvakame.github.io/sw-hackathon/ で動いてます。
リポジトリ内にはjQueryとAngularJSのコードがありませんが、scripts/bundle.jsを取得しようとした時にServiceWorker内部で頑張って依存関係を解決してconcatしたbundle.jsを生成して返します。
CDNとかnpmに対応しています。

スライド
http://www.slideshare.net/vvakame/serviceworker
