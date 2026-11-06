Abas de linha com indicador inferior de 3 px; trocam a visualização mantendo a seleção de bairro.
~~~jsx
<Tabs value="t2" onChange={setTab} items={[{id:'t1',label:'1º turno',sub:'04 out'},{id:'t2',label:'2º turno',sub:'25 out'},{id:'diff',label:'Diferença',sub:'o que mudou'},{id:'br',label:'Brasil',sub:'5.715 municípios'}]} />
~~~
- Use aria-current="page" na ativa (já embutido). Abaixo de 640 px a lista rola na horizontal.
