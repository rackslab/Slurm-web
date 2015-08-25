import xml.etree.ElementTree as ET
from ClusterShell.NodeSet import NodeSet
from settings import settings


class NodeType(object):

    def __init__(self, name, model, height, width):
        self.name = name
        self.model = model
        self.height = height
        self.width = width


class Racksrow(object):

    def __init__(self, racks={}):
        self.racks = racks

    @staticmethod
    def racksrow2dict(racksrow):
        xracks = {}
        for name, rack in racksrow.racks.iteritems():
            xracks[rack.name] = Rack.rack2dict(rack)
        return xracks

    @staticmethod
    def racksrow_array2dict_array(racksrows):
        xracksrows = []
        for racksrow in racksrows:
            xracksrows.append(Racksrow.racksrow2dict(racksrow))
        return xracksrows


class Rack(object):

    def __init__(self, name, posx, posy):
        self.name = name
        self.posx = posx
        self.posy = posy
        self.nodes = []  # list of nodes in the rack

    def __repr__(self):

        rackrepr = "rack %s (posx: %d, posy: %d):\n" % (self.name, self.posx,
                                                        self.posy)
        for node in self.nodes:
            rackrepr += " - %s\n" % (str(node))
        return rackrepr

    def _sort_nodes(self):
        self.nodes.sort(key=lambda node: node.name)

    @staticmethod
    def rack2dict(rack):
        xrack = {}
        xrack['name'] = rack.name
        xrack['posx'] = rack.posx
        xrack['posy'] = rack.posy
        xrack['nodes'] = []

        for node in rack.nodes:
            xrack['nodes'].append(Node.node2dict(node))
        return xrack


class Node(object):

    def __init__(self, name, rack, nodetype, posx, posy):

        self.name = name
        self.rack = rack
        self.nodetype = nodetype
        self.posx = posx
        self.posy = posy

    def __repr__(self):
        noderepr = "%s (model: %s, posx: %f, posy %f)" % (self.name,
                                                          self.nodetype.model,
                                                          self.posx, self.posy)
        return str(noderepr)

    @staticmethod
    def node2dict(node):
        xnode = {}
        xnode['name'] = node.name
        xnode['type'] = node.nodetype.model
        xnode['posx'] = node.posx
        xnode['posy'] = node.posy
        xnode['height'] = node.nodetype.height
        xnode['width'] = node.nodetype.width
        return xnode


def parse_racks():

    FILE = settings.get('racks', 'path')
    try:
        tree = ET.parse(FILE)
    except ET.ParseError as error:
        print error
        return None

    root = tree.getroot()

    # parse nodetypes and fill nodetypes dict with
    # NodeType objects
    nodetypes = {}
    nodetypes_e = root.find('nodetypes').findall('nodetype')
    for nodetype_e in nodetypes_e:
        nodetype = NodeType(nodetype_e.get('id'),
                            nodetype_e.get('model'),
                            float(nodetype_e.get('height')),
                            float(nodetype_e.get('width')))
        nodetypes[nodetype.name] = nodetype

    racks = []
    # parse racks with nodes
    racksrows_e = root.find('racks').findall('racksrow')
    for racksrow_e in racksrows_e:
        racksrow = {}
        racks_e = racksrow_e.findall('rack')

        for rack_e in racks_e:
            posx = int(rack_e.get('posx')) if rack_e.get('posx') else 0
            posy = int(rack_e.get('posy')) if rack_e.get('posy') else 0
            rack = Rack(rack_e.get('id'), posx, posy)
            racksrow[rack.name] = rack

            # parse nodes
            nodes_e = rack_e.find('nodes').findall('node')
            for node_e in nodes_e:
                nodetype = nodetypes[node_e.get('type')]
                posx = float(node_e.get('posx')) if node_e.get('posx') else 0
                posy = float(node_e.get('posy')) if node_e.get('posy') else 0
                node = Node(node_e.get('id'), rack, nodetype, posx, posy)
                # add node to rack
                rack.nodes.append(node)

            # parse nodesets
            nodesets_e = rack_e.find('nodes').findall('nodeset')
            for nodeset_e in nodesets_e:
                nodeset = NodeSet(nodeset_e.get('id'))
                draw_dir = 1 if (not nodeset_e.get('draw') or
                                 nodeset_e.get('draw') == "up") else -1
                nodetype = nodetypes[nodeset_e.get('type')]
                cur_x = float(
                    nodeset_e.get('posx')
                    ) if nodeset_e.get('posx') else 0
                cur_y = float(
                    nodeset_e.get('posy')
                    ) if nodeset_e.get('posy') else 0
                for xnode in nodeset:
                    node = Node(xnode, rack, nodetype, cur_x, cur_y)
                    rack.nodes.append(node)
                    cur_x += nodetype.width
                    if cur_x == 1:
                        cur_x = float(0)
                        cur_y += nodetype.height * draw_dir

        racks.append(Racksrow(racksrow))

    return Racksrow.racksrow_array2dict_array(racks)
