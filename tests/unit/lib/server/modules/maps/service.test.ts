const mapsRepositoryMock = vi.hoisted(() => ({
  list: vi.fn(),
  count: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getItemById: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  listItemIdsByMap: vi.fn(),
  reorderItems: vi.fn(),
}));

vi.mock("@/lib/server/modules/maps/repository", () => ({ mapsRepository: mapsRepositoryMock }));

import { mapsService } from "@/lib/server/modules/maps/service";

const mapId = "00000000-0000-4000-8000-000000000001";
const otherMapId = "00000000-0000-4000-8000-000000000002";
const itemId = "00000000-0000-4000-8000-000000000003";
const secondItemId = "00000000-0000-4000-8000-000000000004";

describe("mapsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects item creation when its map does not exist", async () => {
    mapsRepositoryMock.getById.mockResolvedValue(null);
    await expect(
      mapsService.createItem({ mapId, title: "Point", latitude: 44.6471, longitude: 10.9252 }),
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
  });

  it("enforces the provincial boundary for direct item creation", async () => {
    mapsRepositoryMock.getById.mockResolvedValue({ id: mapId });

    await expect(
      mapsService.createItem({ mapId, title: "Outside", latitude: 44.4949, longitude: 11.3426 }),
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });

    expect(mapsRepositoryMock.createItem).not.toHaveBeenCalled();
  });

  it("rejects updates for a missing item and a different map owner", async () => {
    mapsRepositoryMock.getItemById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: itemId, mapId: otherMapId });
    await expect(mapsService.updateItem(mapId, itemId, { title: "Point" })).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
    await expect(mapsService.updateItem(mapId, itemId, { title: "Point" })).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
    });
    expect(mapsRepositoryMock.updateItem).not.toHaveBeenCalled();
  });

  it("requires a complete item set before reordering", async () => {
    mapsRepositoryMock.getById.mockResolvedValue({ id: mapId });
    mapsRepositoryMock.listItemIdsByMap.mockResolvedValue([{ id: itemId }, { id: secondItemId }]);
    await expect(
      mapsService.reorderItems({ mapId, orderedItemIds: [itemId] }),
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
    expect(mapsRepositoryMock.reorderItems).not.toHaveBeenCalled();
  });
});
