export type CloseFunction = () => Promise<any>;

interface ActiveResource {
  name: string;
  close: CloseFunction;
}

class ResourceManager {
  private activeResources: ActiveResource[] = [];

  register(name: string, close: CloseFunction) {
    this.activeResources.push({ name, close });
  }

  async shutdownAll() {
    await Promise.all(
      this.activeResources.map(({ name, close }) => {
        console.log('shutting down %s', name);
        return close();
      })
    );
  }
}

const rm = new ResourceManager();

export default rm;
