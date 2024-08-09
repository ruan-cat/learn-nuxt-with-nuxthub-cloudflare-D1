export default eventHandler(async (event) => {

  await useKV('hello').setItem('foo', 'world')
  return useKV('hello').getKeys()
})